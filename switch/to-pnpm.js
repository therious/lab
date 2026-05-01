// to-pnpm.js
//
// Reverts the monorepo to pnpm mode:
//   - Removes generated package.json files (those sitting alongside a package.yaml)
//   - Restores workspace: protocol in real package.json files (libs/cmps)
//   - Wipes all node_modules
//
// Run from the switch/ directory:
//   npm run to-pnpm        (after: cd .. && pnpm install)
//   node to-pnpm.js
//
// Safe to run multiple times — fully idempotent. No state file is used.
// Restoration works by checking which packages are workspace members and
// re-adding the workspace: prefix to deps that reference them by name.
// Running this when already in pnpm mode is a no-op (nothing to restore).
//
// package.yaml files are never touched — they are always the source of truth.

import { rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { globSync } from 'glob';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const wsConfig       = yaml.load(readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8'));
const workspaceGlobs = wsConfig.packages ?? [];

const GLOB_OPTS = {
  cwd:      ROOT,
  absolute: true,
  follow:   false,
  ignore:   ['**/node_modules', '**/deps', '**/.git'],
};

// Paths that pass through a node_modules or deps directory should never be
// treated as workspace members. The glob ignore patterns above prevent *finding*
// most of them, but glob v10 doesn't always prevent descent into ignored dirs.
// This filter is the definitive guard.
function isWorkspacePath(p) {
  return !/[/\\](node_modules|deps)[/\\]/.test(p);
}

const memberYamls = workspaceGlobs
  .filter(g => !g.startsWith('!'))
  .flatMap(g => globSync(`${g}/package.yaml`, GLOB_OPTS));

const allYamls = [join(ROOT, 'package.yaml'), ...memberYamls];

// ── Remove generated package.json files ───────────────────────────────────────
// Only files that sit next to a package.yaml are considered generated.

console.log('\nRemoving generated package.json files...\n');

let removed = 0;
for (const yamlPath of allYamls) {
  const pkgJson = join(dirname(yamlPath), 'package.json');
  if (existsSync(pkgJson)) {
    rmSync(pkgJson);
    console.log(`  removed  ${pkgJson.replace(ROOT + '/', '')}`);
    removed++;
  }
}
console.log(`\n${removed} file(s) removed.`);

// ── Restore workspace: protocol in real package.json files ────────────────────
// to-npm.js stripped "workspace:X" → "X" from libs/cmps that have real package.json
// files (no sibling package.yaml). We reverse this by:
//   1. Collecting the names of all workspace member packages.
//   2. For each real package.json, any dep whose name is a workspace member and
//      whose version was stripped (bare specifier with no workspace: prefix) gets
//      "workspace:" prepended.
//
// This is safe because workspace member names are project-scoped (@therious/*),
// making accidental collisions with external packages extremely unlikely.
// Running when already in pnpm mode is a no-op: the refs already have workspace:
// so the condition below won't match.

// Collect workspace member names from all package.json files in the workspace.
const workspaceNames = new Set();
const allPkgJsons = workspaceGlobs
  .filter(g => !g.startsWith('!'))
  .flatMap(g => globSync(`${g}/package.json`, GLOB_OPTS));

for (const p of allPkgJsons.filter(isWorkspacePath)) {
  try {
    const { name } = JSON.parse(readFileSync(p, 'utf8'));
    if (name) workspaceNames.add(name);
  } catch { /* skip unparseable files */ }
}

// Real package.json files are those without a sibling package.yaml.
const yamlDirs     = new Set(allYamls.map(p => dirname(p)));
const realPkgJsons = allPkgJsons.filter(p => isWorkspacePath(p) && !yamlDirs.has(dirname(p)));

function restoreWorkspaceDeps(pkg) {
  let changed = false;
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    if (!pkg[key]) continue;
    for (const [name, ver] of Object.entries(pkg[key])) {
      // Re-add workspace: if this dep is a workspace member and the version
      // does not already have the workspace: prefix.
      if (workspaceNames.has(name) && !String(ver).startsWith('workspace:')) {
        pkg[key][name] = `workspace:${ver}`;
        changed = true;
      }
    }
  }
  return changed;
}

console.log('\nRestoring workspace: protocol in real package.json files...\n');

let restored = 0;
for (const pkgPath of realPkgJsons) {
  const rel = pkgPath.replace(ROOT + '/', '');
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch (err) {
    console.error(`  ERROR reading ${rel}: ${err.message}`);
    continue;
  }

  if (!restoreWorkspaceDeps(pkg)) continue;  // already clean, skip

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`  restored  ${rel}`);
  restored++;
}
console.log(restored > 0 ? `\n${restored} file(s) restored.` : '\nNothing to restore — already in pnpm form.');

// ── Wipe node_modules ─────────────────────────────────────────────────────────

console.log('\nRemoving node_modules...\n');

const moduleDirs = globSync('**/node_modules', {
  cwd:    ROOT,
  absolute: true,
  ignore: ['switch/**'],
});

for (const dir of moduleDirs) {
  rmSync(dir, { recursive: true, force: true });
  console.log(`  removed  ${dir.replace(ROOT + '/', '')}`);
}

console.log('\nDone. Next: cd .. && pnpm install\n');
