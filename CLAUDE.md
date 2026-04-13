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
Items 1–5 from the original list are done (auth providers, patches removed,
firebase.txt cleaned up, env.local commented, users view + 1-1 chat built).

### Ticket app — pending implementation (implement in order, commit each separately)

**Resizable splits**
- Add `react-resizable-panels` to ticket's package.yaml
- Replace fixed-width `UsersPane` / `ChatPane` layout in `UsersView.tsx` with
  horizontal `PanelGroup` (users+groups left | chat right)
- Add vertical split inside the left panel (users grid top | group chats grid bottom)
- Both splits should be draggable and persist size across re-renders (use `Panel` defaultSize)

**Group chats (items 6–12 from original list)**
- New Redux slice: `group-chats-slice.ts` — types `GroupChat`, `GroupChatsState`;
  actions: `setGroupChats`, `addGroupChat` (pending=true), `setGroupConversation`,
  `groupMessageSent`, `groupMessageReceived`, `markGroupRead`
- Register slice in `combined-slices.ts`
- Firestore collection: `groupChats/{autoId}` with fields
  `participants[]`, `nickname`, `createdBy`, `createdAt`, `lastMessageAt`
  Messages subcollection identical structure to 1-1 chats
- Switch users grid to `rowSelection="multiple"`; right-click must NOT change selection —
  context menu operates on whatever rows are already selected
- Right-click context menu (react-contexify, already installed) offers:
  - "New chat with [Name]" when exactly 1 row selected (creates a named 1-person group chat)
  - "New group chat…" when 2+ rows selected
  - Both options open a `Modalize` nickname dialog before creating
- Lazy instantiation: `addGroupChat` creates a Redux entry with `pending: true`;
  Firestore document is written only when the first message is sent
  (use a write batch: create doc + add message atomically)
- Group chats grid columns: multi-avatar (up to 3 icons), comma-joined names,
  nickname, last message date; pending chats shown in italics
- `user-unread` bold rule applies identically to the group chats grid rows
- Extend `Chat.tsx` to accept `target: {kind:'1-1'; them:UserRec} | {kind:'group'; chatId:string}`;
  header shows multi-avatar + nickname for group chats; applies same `HISTORY_LIMIT`
- Background listener in `UsersView`: `onSnapshot` on
  `groupChats where participants array-contains myUid` — keeps group chats list fresh
  and populates recipient's grid when first message is sent (item 12)
- Per-group background message listeners (same pattern as 1-1) for unread detection

**App-origin scoping (DEFERRED — do after all group chat work is complete)**
- Implement AFTER resizable splits and group chats are fully working
- Single Firebase project + single database for now; no multiple-database complexity
- Decided namespace strategy: use `hostname:port` as the Firestore key
  (e.g. `localhost:5173`, `ticket.example.com:443`). Escape the colon to `_`
  if Firestore rejects it as a document ID character, giving `localhost_5173`.
  Derive at runtime from `window.location.hostname` + `window.location.port`.
- Data model when implemented: `apps/{hostPort}/users/{uid}`,
  `apps/{hostPort}/chats/...`, `apps/{hostPort}/groupChats/...`
- `auth.ts` and all Firestore listeners will need the namespace injected
- Security rules and firebase-setup.md to be updated at that time
- One Firebase project is sufficient; each app's free-tier quota is shared but
  light usage across a few apps will stay well within Spark limits

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
