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
never has them (or gitignores them). No files need to be deleted when switching between the
two package managers.

### What needs converting

| pnpm concept | npm equivalent |
|---|---|
| `package.yaml` manifest | `package.json` (generated) |
| `workspace:*` protocol | `*` (npm resolves local workspace packages by name) |
| `pnpm-workspace.yaml` packages list | `workspaces` array in root `package.json` |
| `pnpm.overrides` in root manifest | `overrides` at root `package.json` level |
| YAML anchors (`&ag ~32.0.2` / `*ag`) | resolved to their literal values by the parser |

### Conversion script — `scripts/yaml-to-npm.js`

A Node.js script that walks the workspace and generates `package.json` next to every
`package.yaml`. No new dependencies are needed — `js-yaml` is already a transitive
dependency, and `glob` is already in root devDependencies.

**Algorithm:**

```
for each package.yaml in (root + all workspace globs):
  1. Parse with js-yaml (anchors are resolved automatically by the parser)
  2. Replace every dependency value matching /^workspace:/ with the bare version
     ("workspace:*" → "*", "workspace:~1.2.3" → "~1.2.3")
  3. If this is the root manifest:
     a. Add "workspaces" from pnpm-workspace.yaml packages list
     b. Rename "pnpm.overrides" → "overrides"
  4. Write package.json (pretty-printed JSON)
```

Run it:
```bash
node scripts/yaml-to-npm.js        # generate all package.json files
npm install                        # install from generated manifests
```

The script is idempotent — re-running it after adding a dependency to a `package.yaml`
regenerates the corresponding `package.json` in place.

### Root `package.json` additions (alt branch only)

The root `package.json` needs two things the root `package.yaml` does not have:

```json
{
  "workspaces": [
    "apps/**",
    "servers/**",
    "cmps/**",
    "libs/**",
    "scripts",
    "!**/test/**"
  ]
}
```

These are taken directly from `pnpm-workspace.yaml` by the conversion script.

### Keeping `alt` in sync with `main`

`package.yaml` files are the source of truth. The workflow when a dependency changes:

```bash
# 1. On main (or merged into alt): edit the relevant package.yaml
# 2. On alt: run the conversion script
node scripts/yaml-to-npm.js
# 3. Commit both the package.yaml change and the regenerated package.json
git add '**/package.json' package.json
git commit -m "sync: regenerate package.json files"
```

A cherry-pick from `main` to `alt` will only bring in `package.yaml` changes. The
regeneration step is always manual on `alt`.

### npm workspace script aliases

The root `package.yaml` uses `pnpm --filter` for scoped commands (`pnpm f ticket start`).
npm does not have a `--filter` shorthand. The generated root `package.json` should include
an equivalent using npm workspaces:

```json
{
  "scripts": {
    "f": "npm run --workspace"
  }
}
```

Usage: `npm run f apps/ticket start`

---

## Part 2 — Offline Demo Mode

### Problem

In the demo environment:
- No internet access → Firebase Auth and Firestore calls fail
- No Finnhub WebSocket → feed is silent (already handled by MockAdapter)
- Firebase JS SDK connects to Google endpoints by default

### Approach

A new server package `servers/demo` running Fastify. It implements the minimal subset of
the Firebase REST API that the apps actually call, backed by a local JSON file store. The
apps detect an environment variable (`VITE_DEMO_MODE=true`) and redirect their Firebase SDK
connections to this local server instead of Google.

Firebase itself supports this pattern via its Emulator Suite. The JS SDK ships
`connectAuthEmulator` and `connectFirestoreEmulator` helpers that point the SDK at a local
host. The demo server implements the emulator wire protocol for the subset the apps use,
so no changes are needed to app logic — only to `firebase.ts` in each app.

### What the demo server implements

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

**Persistence:** a single `demo-data.json` file written on every mutation. This survives
server restarts and gives the demo a consistent starting state that can be committed.

**Finnhub feed:** already handled — `MockAdapter` runs locally with no network calls.

### `servers/demo` package structure

```
servers/demo/
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
      demo-data.json ← initial data committed to the repo (users, roles, demo messages)
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
# Terminal 1 — demo server (auth + firestore emulation)
pnpm f demo start        # or: npm run f servers/demo start

# Terminal 2 — app (zclient or any other)
pnpm f zclient start
```

The MockAdapter starts automatically once the user logs in via the demo server.

---

## Part 3 — Migration to Main

### What gets promoted

Once `servers/demo` is working and validated on `alt`, it should move to `main` as a
first-class member of the monorepo. It is useful beyond the constrained demo environment:

- **Local development without a live Firebase project** — onboarding new contributors
  without giving them Firebase credentials
- **CI testing** — run integration tests against the demo server instead of a shared
  Firebase project
- **Snapshot testing** — commit `demo-data.json` with known state for reproducible tests

### Migration path

1. Open a PR from `alt` into `main` containing only `servers/demo/**`
2. Add `VITE_DEMO_MODE` guard to `firebase.ts` in all apps (small, safe change)
3. The conversion script (`scripts/yaml-to-npm.js`) stays `alt`-only — it is only
   useful if npm compatibility is needed again

### What stays in `alt`

- All generated `package.json` files
- `scripts/yaml-to-npm.js`
- Any npm-specific root config (`engines.npm`, etc.)

These are not useful on `main` and would create noise. The `alt` branch is rebased or
merged periodically from `main` and the `package.json` files regenerated each time.

---

## Part 4 — Build System Coexistence Day-to-Day

| Situation | Command |
|---|---|
| Normal development (your machine) | `pnpm ...` — reads `package.yaml`, ignores `package.json` |
| Demo environment install | `npm install` — reads `package.json`, ignores `package.yaml` |
| Adding a dependency | Edit `package.yaml`, run `node scripts/yaml-to-npm.js` on `alt`, commit both |
| Pulling `main` changes into `alt` | `git merge main` then `node scripts/yaml-to-npm.js && git add '**/package.json'` |
| Demo server only (no npm build needed) | Cherry-pick `servers/demo` onto `main` directly |

### `.gitignore` strategy

On `main`: add `**/package.json` to `.gitignore` (or leave absent — they won't exist)
On `alt`: `package.json` files are committed and NOT gitignored

This can be handled with a `.gitignore` difference between branches, or simply by
convention (only run the conversion script on `alt`, never on `main`).
