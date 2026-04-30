# Alternate Build Plan

This document covers two parallel efforts on the `alt` branch:

1. **npm build system** — a npm-compatible build alongside the existing pnpm setup
2. **Offline demo mode** — a local Fastify server that spoofs Firebase Auth, Firestore, and
   the Finnhub feed so the apps run in a network-isolated environment

---

## Part 1 — npm Build System

### Why both can coexist in the same tree

pnpm reads `package.yaml` when it exists and ignores `package.json`. npm reads `package.json`
and ignores `package.yaml`. Because of this, both files can live side-by-side in every
package directory. The `alt` branch commits generated `package.json` files; the `main` branch
gitignores them. No app logic changes when switching between the two package managers.

### What needs converting

| pnpm concept | npm equivalent |
|---|---|
| `package.yaml` manifest | `package.json` (generated) |
| `workspace:*` protocol | `*` (npm resolves local workspace packages by name) |
| `pnpm-workspace.yaml` packages list | `workspaces` array in root `package.json` |
| `pnpm.overrides` in root manifest | `overrides` at root `package.json` level |
| YAML anchors (`&ag ~32.0.2` / `*ag`) | resolved to their literal values by the parser |

### Conversion tooling — `switch/`

The `switch/` directory is an isolated Node package (outside all workspace globs) that owns
the conversion scripts. It has its own `package.json` committed so it can bootstrap itself
without any prior install.

```
switch/
  package.yaml     ← source of truth (js-yaml, glob dependencies)
  package.json     ← committed; lets `cd switch && npm install` work from a fresh clone
  to-npm.js        ← generates package.json files, wipes node_modules
  to-pnpm.js       ← removes generated package.json files, wipes node_modules
```

**Switching to npm (fresh clone or after pnpm session):**
```bash
cd switch && npm install     # one-time; installs js-yaml + glob into switch/node_modules
npm run to-npm               # generates all package.json files, wipes node_modules
cd .. && npm install         # installs workspace deps via npm
```

**Reverting to pnpm:**
```bash
cd switch && npm run to-pnpm   # removes generated package.json files, wipes node_modules
cd .. && pnpm install          # reinstalls via pnpm
```

**Why `switch/` is isolated:**
- Lives outside all `pnpm-workspace.yaml` globs so pnpm never touches it
- Has its own committed `package.json` so it works before any install step
- Its `node_modules` is never wiped by the conversion scripts (both `to-npm.js` and
  `to-pnpm.js` exclude `switch/**` when removing `node_modules`)

**Wipe scripts** (remove all artifacts of one side):
- pnpm side: `pnpm wipe` (root `package.yaml`) — removes all `node_modules` trees
- npm side: `npm run wipe` (generated root `package.json`) — removes all `node_modules`
  trees and all generated `package.json` files

### Root `package.json` additions (alt branch only)

The generated root `package.json` gets:

```json
{
  "workspaces": ["apps/**", "servers/**", "cmps/**", "libs/**", "scripts", "!**/test/**"],
  "overrides": { ... },
  "scripts": {
    "generate": "cd switch && npm run to-npm",
    "wipe":     "cd switch && npm run to-pnpm"
  }
}
```

These are injected by `to-npm.js`; they are not in `package.yaml`.

### Keeping `alt` in sync with `main`

`package.yaml` files are the source of truth. When a dependency changes:

```bash
# 1. Edit the relevant package.yaml (on main or after merging main into alt)
# 2. Regenerate package.json files
cd switch && npm run to-npm
# 3. Commit both
git add '**/package.json' package.json
git commit -m "sync: regenerate package.json files"
```

A cherry-pick from `main` to `alt` will only bring in `package.yaml` changes. The
regeneration step is always manual on `alt`.

### npm workspace script aliases

The root `package.yaml` uses `pnpm --filter` for scoped commands (`pnpm f ticket start`).
The generated root `package.json` includes the npm equivalent:

```json
{ "scripts": { "f": "npm run --workspace" } }
```

Usage: `npm run f apps/ticket start`

---

## Part 2 — Offline Demo Mode (mockery)

### Problem

In the demo environment:
- No internet access → Firebase Auth and Firestore calls fail
- No Finnhub WebSocket → feed is silent (already handled by MockAdapter)
- Firebase JS SDK connects to Google endpoints by default

### Approach

A new server package `servers/mockery` running Fastify. It implements the minimal subset of
the Firebase REST API that the apps actually call, backed by a local JSON file store. The
apps detect an environment variable (`VITE_DEMO_MODE=true`) and redirect their Firebase SDK
connections to this local server instead of Google.

Firebase itself supports this pattern via its Emulator Suite. The JS SDK ships
`connectAuthEmulator` and `connectFirestoreEmulator` helpers that point the SDK at a local
host. The demo server implements the emulator wire protocol for the subset the apps use,
so no changes are needed to app logic — only to `firebase.ts` in each app.

### What the mockery server implements

**Auth (port 9099, Firebase Auth Emulator protocol):**
- `POST /identitytoolkit.googleapis.com/v1/accounts:signInWithPassword` — email/password login
- `POST /identitytoolkit.googleapis.com/v1/accounts:signUp` — create user
- `POST /identitytoolkit.googleapis.com/v1/accounts:lookup` — get user by token
- Session tokens are simple signed JWTs (no Google infrastructure needed)

**Firestore (port 8080, Firestore Emulator protocol):**
- Document read/write/listen for the collections the apps use:
  - `apps/{appId}/users/{uid}` — user profiles
  - `userRoles/{uid}` — role grants
  - `apps/{appId}/chats/{chatId}/messages` — 1-1 chat messages
  - `apps/{appId}/groupChats/{groupId}` — group metadata
  - `apps/{appId}/groupChats/{groupId}/messages` — group messages
- Real-time listeners via Server-Sent Events (the emulator protocol uses SSE/WebSocket)

**Persistence:** a single `mockery-data.json` file written on every mutation. This survives
server restarts and gives the demo a consistent starting state that can be committed.

**Finnhub feed:** already handled — `MockAdapter` runs locally with no network calls.

### `servers/mockery` package structure

```
servers/mockery/
  package.yaml
  server.ts          ← Fastify entry point, mounts auth + firestore routers
  src/
    auth/
      routes.ts      ← auth emulator endpoints
      token.ts       ← JWT sign/verify (using jose or jsonwebtoken)
    firestore/
      routes.ts      ← CRUD + SSE listener endpoints
      store.ts       ← JSON file read/write with in-memory cache
    seed/
      mockery-data.json  ← initial data committed to the repo (users, roles, demo messages)
```

### Switching an app into demo mode

Change `firebase.ts` in each app to check the env var:

```ts
import { connectAuthEmulator }      from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';

export const firebaseAuth = getAuth(app);
export const db           = getFirestore(app);

if (import.meta.env.VITE_DEMO_MODE === 'true') {
  connectAuthEmulator(firebaseAuth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

No other app code changes. The same `UsersProvider`, `useSession`, and all chat/role logic
runs identically against the local server.

Add to `.env.local` (demo environment only):
```
VITE_DEMO_MODE=true
```

### Running the full demo stack

```bash
# Terminal 1 — mockery server (auth + firestore emulation)
pnpm f mockery start        # or: npm run f servers/mockery start

# Terminal 2 — app (zclient or any other)
pnpm f zclient start
```

The MockAdapter starts automatically once the user logs in via the mockery server.

---

## Part 3 — Migration to Main

### What gets promoted

Once `servers/mockery` is working and validated on `alt`, it should move to `main` as a
first-class member of the monorepo. It is useful beyond the constrained demo environment:

- **Local development without a live Firebase project** — onboarding new contributors
  without giving them Firebase credentials
- **CI testing** — run integration tests against the mockery server instead of a shared
  Firebase project
- **Snapshot testing** — commit `mockery-data.json` with known state for reproducible tests

### Migration path

1. Open a PR from `alt` into `main` containing only `servers/mockery/**`
2. Add `VITE_DEMO_MODE` guard to `firebase.ts` in all apps (small, safe change)
3. The `switch/` directory and all generated `package.json` files stay `alt`-only

### What stays in `alt`

- All generated `package.json` files
- `switch/` directory (conversion scripts)
- Any npm-specific root config

These are not useful on `main` and would create noise. The `alt` branch is rebased or
merged periodically from `main` and the `package.json` files regenerated via `switch/` each time.

---

## Part 4 — Build System Coexistence Day-to-Day

| Situation | Command |
|---|---|
| Normal development (your machine) | `pnpm ...` — reads `package.yaml`, ignores `package.json` |
| Demo environment install | `cd switch && npm install && npm run to-npm && cd .. && npm install` |
| Adding a dependency | Edit `package.yaml`, run `cd switch && npm run to-npm` on `alt`, commit both |
| Pulling `main` changes into `alt` | `git merge main` then `cd switch && npm run to-npm && git add '**/package.json'` |
| Wipe pnpm artifacts | `pnpm wipe` (root) — removes all `node_modules`, re-run `pnpm install` |
| Wipe npm artifacts | `npm run wipe` (root) — removes `node_modules` + generated `package.json` files |
| Demo server only (no npm build needed) | Cherry-pick `servers/mockery` onto `main` directly |

### `.gitignore` strategy

On `main`: generated `package.json` files are gitignored (they don't exist on main)
On `alt`: `package.json` files are committed and NOT gitignored

The `switch/package.json` is always committed on both branches (it is not a generated file).
