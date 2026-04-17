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

These ideas are being developed together because their designs interact.
Do not implement any of them until explicitly asked.

---

### Idea 1 — Access request / approval gate (`@therious/users`)

An optional workflow layered on top of the existing auth. When `requireApproval={true}`
is set on `UsersProvider`, a freshly authenticated user is held at a waiting screen until
an admin approves them. Approved users proceed normally; denied users see a rejection screen.

**Firestore data model** (under `apps/{appId}/`):
```
accessRequests/{uid}  { uid, email, displayName, photoURL,
                        status: 'pending'|'approved'|'denied',
                        requestedAt, resolvedAt, resolvedBy, note }
admins/{uid}          { uid: true }   — created manually in Firebase Console only
```

**Library changes:**
- `UsersProvider` gains `requireApproval?: boolean` and `adminUids?: string[]` props
- `useSession` returns a 4th value: `accessStatus: 'not-required'|'checking'|'pending'|'approved'|'denied'`
- New internal screens: `RequestAccessScreen`, `PendingScreen`, `DeniedScreen`
- `AccessRequestsPanel` rendered inside `UsersView` for admin users only — grid of requests
  with Approve / Deny buttons and an optional note field
- "Ignore" = leave `pending` indefinitely; no extra state needed

**Security rules addition:**
```
match /apps/{appId}/accessRequests/{uid} {
  allow create, read: if request.auth.uid == uid;
  allow read, update: if exists(.../admins/$(request.auth.uid));
}
match /apps/{appId}/admins/{uid} {
  allow read:  if request.auth != null;
  allow write: if false;
}
```

**Design question to resolve before implementing:** how does this interact with
Idea 2's game channels — should game channel membership also gate on approval status?

---

### Idea 2 — Chat as a Redux action transport layer (multiplayer / workflow bus)

Use a Firestore chat channel as a real-time delivery mechanism for Redux action payloads,
enabling multiplayer game moves (or workflow events) to flow between clients without a
dedicated game server.

**Core concept:**
Messages in a chat channel can carry a hidden `_action` field in addition to optional
display text. When the chat middleware receives a message containing `_action`, it
dispatches it directly into the Redux store of every connected client. The game/workflow
slice receives the action exactly as if it had been dispatched locally.

**Firestore message shape:**
```
{
  from:      uid,
  fromEmail: string,
  text:      string | null,      // null for pure action messages
  _action:   { type: string, payload: any } | null,
  timestamp: Timestamp,
}
```

**API surface the consuming app uses:**
```ts
// 1. Create a channel dedicated to a game session
const channelId = await createGameChannel(db, appKey(), { gameId, participants });

// 2. Send a local Redux action to all other players via Firestore
await sendGameAction(db, appKey(), channelId, { type: 'game/movePiece', payload: {...} });

// 3. Register which incoming action types the middleware should re-dispatch
//    (whitelist prevents arbitrary remote code execution)
initGameMiddleware(['game/movePiece', 'game/endTurn', 'game/resign']);
```

**Middleware behaviour:**
- Existing `chatMiddleware` is extended (or a sibling `gameMiddleware` is added)
- On receiving a message with `_action`, checks it against the registered whitelist
- If allowed, dispatches `_action` into the Redux store — the game slice handles it
  identically to a local action
- Messages with `_action` and `text: null` are hidden from the chat UI by default;
  messages with both fields show a minimal indicator (e.g. "▶ game event")

**Channel types to consider:**
- `1-1` (existing) — could carry game actions between two players
- `group` (existing) — could carry game actions for a multi-player session
- `dedicated` (new, no UI) — pure action bus, no chat UI rendered at all

**Open design questions:**
1. Should dedicated/game channels live under `groupChats` (re-use existing path) or a
   new `gameChannels` collection? Re-use is simpler; separate collection allows different
   security rules and cleaner Firestore separation.
2. How does channel creation relate to group chat creation? Currently group chats are
   created lazily (on first message). Game channels may need to be created eagerly so
   all players are subscribed before the first move.
3. Relation to Idea 1: should game channel participation require an approved access
   request, or is channel membership (array-contains participant check) sufficient?
4. Relation to workflows generally: a workflow step (e.g. "approve PR", "sign document")
   is structurally identical to a game move — an action payload delivered to other
   clients via a channel. The same transport layer could serve both. Discuss separately.

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
