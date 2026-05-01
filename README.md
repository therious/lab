
# Therious <img alt="Lab Icon"  src="./docs/images/beaker-drop.svg" width="64px" style="margin-bottom:-16px"> Lab

A modest monorepo

Continue to [documentation](./docs/topics/lab-intro.md)

## Build system

The repo uses **pnpm** with `package.yaml` manifests as the primary build system.
An npm-compatible mode is available via the `switch/` directory for environments
where pnpm is not available.

**Switch to npm:**
```bash
cd switch && npm install              # one-time: installs js-yaml + glob into switch/node_modules
npm run to-npm                        # generates package.json files alongside every package.yaml
cd .. && npm install --legacy-peer-deps   # install workspace deps (flag needed: npm is stricter than pnpm on peer deps)
```

**Revert to pnpm:**
```bash
cd switch && npm run to-pnpm   # removes generated package.json files and all node_modules
cd .. && pnpm install
```

**Wipe everything** (works from either side): `cd switch && npm run wipe` — removes all node_modules and all generated package.json files. Safe to run multiple times regardless of current state.

## Running individual apps (npm)

After `npm install --legacy-peer-deps`, run or build any app from the repo root:

```bash
npm run start -w apps/ticket
npm run start -w apps/zclient
npm run build -w apps/ticket
```

Or `cd` into the package directly:

```bash
cd apps/ticket && npm start
cd apps/ticket && npm run build
```

Apps with a `start` script run a Vite dev server (default port 5173). If two apps are started simultaneously, the second will use the next available port.

