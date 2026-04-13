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

### Ticket app — deferred

**App-origin scoping (implement when ready to package chat as a micro-frontend)**
- Namespace all Firestore paths under `apps/{hostPort}/...` so multiple apps on
  different origins share one Firebase project without data collision
- Strategy: derive key at runtime from `window.location.hostname + '_' + window.location.port`
  (colon escaped to `_` for Firestore document ID safety)
- Data model: `apps/{hostPort}/users/{uid}`, `apps/{hostPort}/chats/...`,
  `apps/{hostPort}/groupChats/...`
- Touch points: `auth.ts`, all Firestore collection refs in `UsersView.tsx` and `Chat.tsx`,
  `actions-integration/index.tsx`, security rules, `firebase-setup.md`
- Single Firebase project is sufficient; Spark-plan quota is shared but adequate

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
