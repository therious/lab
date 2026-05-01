// to-npm.js
//
// Generates a package.json alongside every package.yaml in the workspace,
// patches workspace: protocol out of real package.json files (libs/cmps),
// then wipes all node_modules so npm can install fresh.
//
// Run from the switch/ directory:
//   npm run to-npm         (after: cd .. && npm install --legacy-peer-deps)
//   node to-npm.js
//
// Safe to run multiple times — idempotent. No state file is used; to-pnpm.js
// reconstructs workspace: refs from the workspace member list rather than
// relying on saved originals.
//
// What it does:
//   1. Reads pnpm-workspace.yaml to discover workspace members.
//   2. For each package.yaml: parses it (js-yaml resolves YAML anchors),
//      strips the workspace: protocol from dependency versions, writes package.json.
//   3. Root manifest additionally gets: workspaces array (resolved to concrete dirs,
//      not raw globs), overrides (from pnpm.overrides), pnpm engine entry removed,
//      and npm-specific utility scripts injected.
//   4. For real package.json files (no sibling package.yaml, e.g. libs/cmps):
//      strips workspace: in-place. to-pnpm.js knows how to reverse this without
//      any saved state.
//   5. Wipes all node_modules directories in the repo so npm installs cleanly.

import { readFileSync, writeFileSync, rmSync } from 'fs';
import { resolve, relative, dirname, join, sep } from 'path';
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

function adaptRoot(pkg, resolvedWorkspaces) {
  // Use resolved directory paths rather than raw pnpm globs.
  // Globs like "servers/**" match recursively and can produce nested workspaces
  // (e.g. servers/elections AND servers/elections/scripts) which crash npm's arborist.
  pkg.workspaces = resolvedWorkspaces;

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

// Never descend into node_modules, deps, or follow symlinks (which could lead
// back into node_modules via npm workspace links).
const GLOB_OPTS = {
  cwd:      ROOT,
  absolute: true,
  follow:   false,
  ignore:   ['**/node_modules', '**/deps', '**/.git'],
};

// Definitive guard: paths that go through node_modules or deps are never
// workspace members, regardless of what the glob returns.
const isWorkspacePath = p => !/[/\\](node_modules|deps)[/\\]/.test(p);

const memberYamls = workspaceGlobs
  .filter(g => !g.startsWith('!'))
  .flatMap(g => globSync(`${g}/package.yaml`, GLOB_OPTS));

const allYamls = [join(ROOT, 'package.yaml'), ...memberYamls];

// Resolve concrete workspace dirs for npm's workspaces array.
const resolvedWorkspaces = [
  ...new Set([
    ...memberYamls.map(p => relative(ROOT, dirname(p)).split(sep).join('/')),
    ...workspaceGlobs
      .filter(g => !g.startsWith('!'))
      .flatMap(g => globSync(`${g}/package.json`, GLOB_OPTS))
      .filter(isWorkspacePath)
      .map(p => relative(ROOT, dirname(p)).split(sep).join('/')),
  ]),
];

// ── Convert yaml-based packages ───────────────────────────────────────────────

console.log(`\nGenerating ${allYamls.length} package.json file(s)...\n`);

for (const yamlPath of allYamls) {
  const isRoot = yamlPath === join(ROOT, 'package.yaml');
  const rel    = relative(ROOT, yamlPath).split(sep).join('/');
  let pkg;
  try {
    pkg = yaml.load(readFileSync(yamlPath, 'utf8'));
  } catch (err) {
    console.error(`  ERROR parsing ${rel}: ${err.message}`);
    continue;
  }

  stripWorkspaceDeps(pkg);
  if (isRoot) adaptRoot(pkg, resolvedWorkspaces);

  const out = join(dirname(yamlPath), 'package.json');
  writeFileSync(out, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`  wrote  ${relative(ROOT, out).split(sep).join('/')}`);
}

// ── Patch real package.json files (no sibling package.yaml) ──────────────────
// Libs and cmps have committed package.json files (not generated from yaml) that
// use workspace: protocol. Strip it so npm can install them.
// to-pnpm.js reverses this without any saved state — see comment there.

const yamlDirs     = new Set(allYamls.map(p => dirname(p)));
const realPkgJsons = workspaceGlobs
  .filter(g => !g.startsWith('!'))
  .flatMap(g => globSync(`${g}/package.json`, GLOB_OPTS))
  .filter(p => isWorkspacePath(p) && !yamlDirs.has(dirname(p)));

console.log('\nPatching real package.json files (stripping workspace: protocol)...\n');

let patched = 0;
for (const pkgPath of realPkgJsons) {
  const rel = relative(ROOT, pkgPath).split(sep).join('/');
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch (err) {
    console.error(`  ERROR reading ${rel}: ${err.message}`);
    continue;
  }

  const before = JSON.stringify(pkg);
  stripWorkspaceDeps(pkg);
  if (JSON.stringify(pkg) === before) continue;

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`  patched  ${rel}`);
  patched++;
}
console.log(patched > 0 ? `\n${patched} file(s) patched.` : '\nNo workspace: refs found — already clean.');

// ── Wipe node_modules ─────────────────────────────────────────────────────────

console.log('\nRemoving node_modules...\n');

const moduleDirs = globSync('**/node_modules', {
  cwd:    ROOT,
  absolute: true,
  ignore: ['switch/**'],
});

for (const dir of moduleDirs) {
  rmSync(dir, { recursive: true, force: true });
  console.log(`  removed  ${relative(ROOT, dir).split(sep).join('/')}`);
}

console.log('\nDone. Next: cd .. && npm install --legacy-peer-deps\n');
