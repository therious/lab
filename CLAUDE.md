# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Guidelines

Read `docs/VibeCodingContract.md` for all coding principles, commit conventions, state management patterns, debugging approach, and anti-patterns. Follow it throughout every session.

## Session Start Protocol

At the start of each session, read these files in order to restore context:
1. `docs/VibeCodingContract.md` — all coding guidelines
2. `docs/topics/lab-intro.md` — workspace structure diagram
3. `docs/topics/tech-stack.md` — technology choices
4. `git log --oneline -20` and `git status` — understand recent work and current state
5. `docs/discussions/` — local-only design decisions (newest first, NOT committed to git)

## Current Tasks

### Ticket app — completed
All chat features are implemented and working:
- Auth, users grid, 1-1 chat with history + unread indicators
- Resizable splits (custom HSplit/VSplit)
- Group chats: create via right-click context menu, nickname dialog, lazy Firestore
  instantiation (writeBatch on first message), per-group unread detection
- Unified chat Redux slice (`chat-slice.ts`) — groups and 1-1 state in one place
- Avatars with live status dots (green/amber/grey) everywhere: user grid, group grid,
  chat header, message bubbles in group chats
- Send error UI (red ErrorBar) with try/catch in both ActiveChat and ActiveGroupChat

## Feature Brainstorming

Six related concepts being matured together. Their designs interact — read all before
implementing any. Do not implement any of them until explicitly asked.

---

### Concept 1 — RoleModel

The identity and permissions substrate that everything else builds on.

**Core rule:** roles are namespaced strings `appname:rolename`. A wildcard role `*:rolename`
is accepted anywhere `appname:rolename` is required, because role names are globally unique
by convention. Roles are flat (no hierarchy for now).

Every authenticated user implicitly holds `*:user` — the baseline that grants access to
unsecured routes and allows receiving messages. All other roles are explicitly granted.

**Firestore data model (global, not per-app):**
```
userRoles/{uid}   { roles: ['ticket:player', '*:admin', 'roots:editor', ...] }
```
Stored at the root (not under `apps/{appId}/`) because identity is portable across apps.
Role strings are just strings — no registry enforces them for now. Apps are responsible for
knowing which role names they use. A universal permissioning client (Concept 4) will
coordinate this later.

**Grant authority:**
- Roles are not hierarchical; no role automatically implies another
- Who can grant what is a Concept 4 concern for now; initially set manually via Firebase Console
- `*:rolename` grants are more powerful and should be granted only by a trusted admin

**Matching logic (client-side, in the library):**
```ts
// Does the user satisfy a required role?
function satisfies(userRoles: string[], required: string): boolean {
  const [, name] = required.split(':');
  return userRoles.includes(required) ||
         userRoles.includes(`*:${name}`);
}
```

**Firestore security rules recommendation:**
Role enforcement is primarily client-side via RoleGuard (Concept 2). Firestore rules stay
simple — auth + participant-array checks. For rules that do need to inspect roles:
```
function userRoles() {
  return get(/databases/$(database)/documents/userRoles/$(request.auth.uid)).data.roles;
}
```
This costs one `get()` per evaluation and only works for single-document reads (not list
queries). For list operations, rely on query constraints + auth-only, same as groupChats.

**Firestore rules for userRoles collection:**
```
match /userRoles/{uid} {
  allow read:  if request.auth.uid == uid;          // user reads own roles
  allow write: if false;                             // only writable via admin SDK / Console
}
```

---

### Concept 2 — RoleGuard

Route-level protection using RoleModel. Entirely client-side; Firestore rules are a
secondary backstop, not the primary enforcement mechanism.

**API:**
```tsx
// Wrap any route element with required roles
<Route path="/game" element={
  <RoleGuard roles={['ticket:player']}>
    <Game />
  </RoleGuard>
} />
```

`RoleGuard` reads the current user's roles (from Redux state, populated by `useSession`)
and either renders children or redirects. What it redirects to is app-controlled — for now
the convention is that `/` (home) is always safe. A richer fallback (Concept 5 — Foyer)
will handle role-request discovery later.

**`useSession` change:** populate roles into Redux on login by reading `userRoles/{uid}`.
The chat slice (or a new identity slice) holds `{ uid, email, displayName, roles: string[] }`.

**Unsecured routes** are just normal routes with no `RoleGuard` — any authenticated user
(i.e. holder of implicit `*:user`) can reach them. Unauthenticated users still see the
login screen.

**Admin-initiated contact for no-role users:** an admin can always open a 1-1 chat to any
authenticated user regardless of their roles. The no-role user sees a minimal shell — just
enough to receive and respond to that message. This shell is the seed of Concept 5.

---

### Concept 3 — ActionBus

Every message on a channel IS a Redux action. Chat messages are just the familiar case
(`chat/messageReceived`) — actions whose payload contains display text. Any other slice can
participate by sending actions through the same channel. The middleware dispatches all
incoming messages into the store; Redux routes each to the correct reducer automatically.
There is no special `_action` sidecar field — the message shape is the action shape.

**Firestore message shape (unified):**
```
{
  type:      string,       // Redux action type: 'chat/messageReceived', 'game/movePiece', …
  payload:   any,          // action-specific data; chat payload includes { fromUid, fromEmail, text }
  from:      uid,          // always present — security + audit
  timestamp: Timestamp,    // always present — ordering
}
```

**Middleware behaviour:**
- On receiving a Firestore message, check `type` against the registered whitelist
- If allowed, `store.dispatch({ type, payload })` — the correct reducer handles it
- Chat UI renders messages whose `type` it knows; unknown types are invisible or "▶ event"
- The whitelist is the primary security boundary (Firestore rules cannot constrain message
  content by type, only by participant membership)

**API surface:**
```ts
// Register which action types are safe to dispatch from remote messages
initActionBus(['chat/messageReceived', 'chat/groupMessageReceived', 'game/movePiece', ...]);

// Send any Redux action to all channel participants via Firestore
await sendChannelAction(db, appKey(), channelId, { type: 'game/movePiece', payload: {...} });
```

**Channel access model:** unchanged from today. Who can subscribe is controlled by
participant arrays + RoleGuard on the UI. Channel type (chat vs game vs workflow) is just
a matter of which action types flow through it — no separate collection needed.

**Migration note:** existing Firestore messages lack a `type` field. A backwards-compat
read path (treat missing `type` as `chat/messageReceived`) is needed when ActionBus lands.

**Open design questions:**
1. Should `chatMiddleware` be renamed/extended into `actionBusMiddleware`, or should
   ActionBus be a separate middleware that chat registers with? Separate is cleaner;
   chat becomes a consumer of ActionBus rather than ActionBus being bolted onto chat.
2. Eager vs lazy channel creation: current group chats are created lazily on first message.
   A game/workflow channel may need to exist before the first action so all participants
   are subscribed. Resolve at implementation time.
3. Workflows: a workflow step (approve, sign, escalate) is structurally identical to a
   game move — an action payload delivered via a channel. Workflow-specific concerns
   (ordering, idempotency, audit trail) are a separate concept to mature.

---

### Concept 4 — Permissioner

A universal cross-app admin client (a new app in the monorepo) that can see and manage
all users who have ever authenticated into the system, across all app origins.

**Scope:**
- Reads from global `userRoles/{uid}` and per-app `apps/{appId}/users/{uid}` collections
- Can grant / revoke any role including `*:rolename` wildcards
- Can see which apps a user has accessed (which `apps/{appId}/users/{uid}` docs exist)
- Initiates contact with any user regardless of their roles (admin-to-user channel)

**This is where grant authority lives.** For now, roles are set manually in Firebase Console.
Permissioner formalizes that into a UI and defines who-can-grant-what rules.

**Open design questions:**
1. Does Permissioner itself use RoleGuard? Almost certainly yes — access to it requires
   something like `*:superadmin`.
2. Is Permissioner a standalone app (separate origin → separate appKey) or is it a route
   within an existing app? Standalone is cleaner for security scoping.

---

### Concept 5 — Foyer

A universal home route / landing shell that every app includes. Safe for any authenticated
user regardless of roles. Serves three purposes:

1. **Discovery** — shows the user which routes/features they have access to and which roles
   they could request to unlock more
2. **Role request** — lets a user request a specific role; the request goes to Permissioner
   (or an app-local admin) for approval
3. **Minimal shell for no-role users** — the landing place after login when the user has
   no app-specific roles; they can see what exists and can receive admin-initiated messages

This is the replacement for the current simple redirect-to-home fallback in RoleGuard.
Foyer is a component the library provides; apps configure it with a list of role
descriptions to display.

---

### Concept 6 — Actor

An automated identity (server process, Cloud Function, bot) that holds roles and can
initiate channels, send messages, and dispatch ActionBus actions on behalf of the system.

**Key distinction from a human user:** an Actor uses the Firebase Admin SDK (service
account), so it bypasses Firestore security rules. Its role grants are advisory — used
by client-side RoleGuard to decide whether to render Actor-generated content — not for
rules enforcement.

**Use cases:**
- A game server Actor that referees moves and sends `game/invalidMove` actions via ActionBus
- A workflow Actor that triggers the next step automatically when conditions are met
- An onboarding Actor that messages new users in Foyer

Matures further when Concept 3 (ActionBus) and Concept 4 (Permissioner) are implemented.

## Commands

```bash
# Root (monorepo-wide)
pnpm lint                         # ESLint all .js/.jsx/.ts/.tsx files
pnpm test                         # Run vitest for all libs with test scripts
pnpm index                        # Regenerate library index (--watch=false)
pnpm f <app-name> <script>        # Scoped to one workspace, e.g. pnpm f ticket start

# Individual app/server (cd into directory first)
pnpm start                        # Dev server (Vite apps default to port 5173)
pnpm build                        # Production build
pnpm tsc --noEmit                 # Type-check only (required before declaring work complete)

# Elections server (Elixir/Phoenix, port 4000)
mix deps.get && mix compile
mix phx.server
# Or build UI + start together:
cd apps/elect && pnpm serve

# Infrastructure
pnpm mgStart / mgStop             # Memgraph graph DB via Docker Compose
```

## Gotchas

- Root config is `package.yaml`, not `package.json`
- `docs/discussions/` is in `.gitignore` — never commit these local context files
- `zclient` requires an external Java Spring Boot OMS feed to function
- Elections server creates a separate SQLite DB per election in `servers/elections/priv/repo/`
- Deployment uses BIP39 mnemonic tags; see `docs/deployments-and-releases.md`
