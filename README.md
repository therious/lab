
# Therious <img alt="Lab Icon"  src="./docs/images/beaker-drop.svg" width="64px" style="margin-bottom:-16px"> Lab

A modest monorepo

Continue to [documentation](./docs/topics/lab-intro.md)

## Build system

The repo uses **pnpm** with `package.yaml` manifests as the primary build system.
An npm-compatible mode is available via the `switch/` directory for environments
where pnpm is not available.

**Switch to npm:**
```bash
cd switch && npm install     # one-time: installs js-yaml + glob into switch/node_modules
npm run to-npm               # generates package.json files alongside every package.yaml
cd .. && npm install         # install workspace deps via npm
```

**Revert to pnpm:**
```bash
cd switch && npm run to-pnpm   # removes generated package.json files and all node_modules
cd .. && pnpm install
```

**Wipe everything** (works from either side): `pnpm wipe` or `npm run wipe` — removes all node_modules and all generated package.json files.

