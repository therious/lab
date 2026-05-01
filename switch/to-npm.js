// to-npm.js
//
// Generates a package.json alongside every package.yaml in the workspace,
// then wipes all node_modules so npm can install fresh.
//
// Run from the switch/ directory:
//   npm run to-npm         (after: cd .. && npm install)
//   node to-npm.js
//
// What it does:
//   1. Reads pnpm-workspace.yaml to discover workspace members.
//   2. For each package.yaml: parses it (js-yaml resolves YAML anchors),
//      strips the workspace: protocol from dependency versions, writes package.json.
//   3. Root manifest additionally gets: workspaces array, overrides (from pnpm.overrides),
//      pnpm engine entry removed, and npm-specific utility scripts injected.
//   4. Wipes all node_modules directories in the repo so npm installs cleanly.

import { readFileSync, writeFileSync, rmSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { globSync } from 'glob';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ── Conversion helpers ────────────────────────────────────────────────────────

function stripWorkspace(value) {
  if (typeof value === 'string' && value.startsWith('workspace:')) {
    const bare = value.slice('workspace:'.length);
    return bare === '' ? '*' : bare;
  }
  return value;
}

function stripWorkspaceDeps(pkg) {
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    if (!pkg[key]) continue;
    for (const [name, ver] of Object.entries(pkg[key])) {
      pkg[key][name] = stripWorkspace(ver);
    }
  }
}

function adaptRoot(pkg, workspaceGlobs) {
  pkg.workspaces = workspaceGlobs;

  if (pkg.pnpm?.overrides) pkg.overrides = pkg.pnpm.overrides;
  delete pkg.pnpm;

  if (pkg.engines?.pnpm) {
    delete pkg.engines.pnpm;
    if (Object.keys(pkg.engines).length === 0) delete pkg.engines;
  }

  pkg.scripts = pkg.scripts ?? {};

  // Replace pnpm-specific script shortcuts with npm equivalents
  if (pkg.scripts.f) pkg.scripts.f = 'npm run --workspace';
  if (pkg.scripts.test) {
    pkg.scripts.test = pkg.scripts.test.replace(
      /pnpm --filter "[^"]*" --recursive run test/,
      'npm run test --workspaces --if-present'
    );
  }

  // Inject npm-side utility scripts (these live only in the generated package.json)
  pkg.scripts.generate = 'cd switch && node to-npm.js';

  // Flag any remaining pnpm references
  for (const [name, cmd] of Object.entries(pkg.scripts)) {
    if (typeof cmd === 'string' && cmd.includes('pnpm')) {
      console.warn(`  ⚠  scripts.${name} still references pnpm — may need manual update`);
    }
  }
}

// ── Discover workspace ────────────────────────────────────────────────────────

const wsConfig       = yaml.load(readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8'));
const workspaceGlobs = wsConfig.packages ?? [];

const memberYamls = workspaceGlobs
  .filter(g => !g.startsWith('!'))
  .flatMap(g => globSync(`${g}/package.yaml`, { cwd: ROOT, absolute: true }));

const allYamls = [join(ROOT, 'package.yaml'), ...memberYamls];

// ── Convert ───────────────────────────────────────────────────────────────────

console.log(`\nGenerating ${allYamls.length} package.json file(s)...\n`);

for (const yamlPath of allYamls) {
  const isRoot = yamlPath === join(ROOT, 'package.yaml');
  const rel    = yamlPath.replace(ROOT + '/', '');
  let pkg;
  try {
    pkg = yaml.load(readFileSync(yamlPath, 'utf8'));
  } catch (err) {
    console.error(`  ERROR parsing ${rel}: ${err.message}`);
    continue;
  }

  stripWorkspaceDeps(pkg);
  if (isRoot) adaptRoot(pkg, workspaceGlobs);

  const out = join(dirname(yamlPath), 'package.json');
  writeFileSync(out, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`  wrote  ${out.replace(ROOT + '/', '')}`);
}

// ── Wipe node_modules ─────────────────────────────────────────────────────────

console.log('\nRemoving node_modules...\n');

// Find all node_modules up to depth 4, not descending into existing ones
const moduleDirs = globSync('**/node_modules', {
  cwd:      ROOT,
  absolute: true,
  ignore:   ['**/node_modules/**', 'switch/**'],  // leave switch's own intact
});

for (const dir of moduleDirs) {
  rmSync(dir, { recursive: true, force: true });
  console.log(`  removed  ${dir.replace(ROOT + '/', '')}`);
}

console.log('\nDone. Next: cd .. && npm install\n');
