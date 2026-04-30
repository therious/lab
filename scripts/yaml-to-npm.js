#!/usr/bin/env node
// yaml-to-npm.js
//
// Converts every package.yaml in the monorepo into a package.json that npm
// workspaces can consume. Run this on the alt branch whenever a package.yaml
// changes, then commit the regenerated package.json files alongside it.
//
// Usage:
//   node scripts/yaml-to-npm.js           # convert all packages
//   node scripts/yaml-to-npm.js --dry-run # print what would change, write nothing
//
// How it works:
//   1. Reads pnpm-workspace.yaml to discover workspace globs.
//   2. Finds every package.yaml matched by those globs + the root manifest.
//   3. Parses each with js-yaml (YAML anchors are resolved automatically).
//   4. Strips the "workspace:" protocol from dependency version strings.
//   5. For the root manifest: adds "workspaces", promotes pnpm.overrides →
//      overrides, removes the pnpm key and the engines.pnpm field.
//   6. Writes package.json next to each package.yaml.
//
// Dependency notes:
//   js-yaml is in root devDependencies. Run pnpm install before this script
//   if it is not yet present in node_modules.

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { globSync } from 'glob';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const ROOT       = resolve(__dirname, '..');
const DRY_RUN    = process.argv.includes('--dry-run');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip the pnpm workspace protocol, leaving the bare version specifier. */
function stripWorkspace(value) {
  if (typeof value === 'string' && value.startsWith('workspace:')) {
    const bare = value.slice('workspace:'.length);
    // "workspace:*" → "*", "workspace:~1.2.3" → "~1.2.3", etc.
    return bare === '' ? '*' : bare;
  }
  return value;
}

/** Walk all dependency-like keys and strip workspace: from every value. */
function stripWorkspaceDeps(pkg) {
  const DEP_KEYS = [
    'dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies',
  ];
  for (const key of DEP_KEYS) {
    if (!pkg[key]) continue;
    for (const [name, ver] of Object.entries(pkg[key])) {
      pkg[key][name] = stripWorkspace(ver);
    }
  }
}

/** Convert the root manifest: add workspaces, hoist overrides, clean pnpm keys. */
function adaptRoot(pkg, workspaceGlobs) {
  // Add workspaces array from pnpm-workspace.yaml
  pkg.workspaces = workspaceGlobs;

  // Hoist pnpm.overrides → overrides
  if (pkg.pnpm?.overrides) {
    pkg.overrides = pkg.pnpm.overrides;
  }
  delete pkg.pnpm;

  // Remove pnpm from engines (npm doesn't need it, and it causes warnings)
  if (pkg.engines?.pnpm) {
    delete pkg.engines.pnpm;
    if (Object.keys(pkg.engines).length === 0) delete pkg.engines;
  }

  // Replace the pnpm --filter alias with an npm workspaces equivalent.
  // npm workspace scoping: npm run <script> -w <workspace>
  if (pkg.scripts?.f) {
    pkg.scripts.f = 'npm run --workspace';
  }

  // Replace pnpm --filter recursive test invocation with npm workspaces equivalent.
  if (pkg.scripts?.test) {
    pkg.scripts.test = pkg.scripts.test.replace(
      /pnpm --filter "[^"]*" --recursive run test/,
      'npm run test --workspaces --if-present'
    );
  }

  // Warn about any remaining pnpm references in scripts.
  if (pkg.scripts) {
    for (const [name, cmd] of Object.entries(pkg.scripts)) {
      if (typeof cmd === 'string' && cmd.includes('pnpm')) {
        console.warn(`  ⚠  scripts.${name} still references pnpm — review manually`);
      }
    }
  }
}

/** Write (or dry-run print) a package.json next to the given package.yaml path. */
function writePackageJson(yamlPath, pkg) {
  const outPath = join(dirname(yamlPath), 'package.json');
  const content = JSON.stringify(pkg, null, 2) + '\n';
  if (DRY_RUN) {
    console.log(`[dry-run] would write ${outPath}`);
    return;
  }
  writeFileSync(outPath, content, 'utf8');
  console.log(`  wrote  ${outPath.replace(ROOT + '/', '')}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

// 1. Read workspace globs from pnpm-workspace.yaml
const wsConfig     = yaml.load(readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8'));
const workspaceGlobs = wsConfig.packages ?? [];

// 2. Find all package.yaml files: root + all workspace members
const memberYamls = workspaceGlobs
  .filter(g => !g.startsWith('!'))                    // skip exclusions
  .flatMap(g => globSync(`${g}/package.yaml`, { cwd: ROOT, absolute: true }));

const allYamls = [join(ROOT, 'package.yaml'), ...memberYamls];

console.log(`Converting ${allYamls.length} package.yaml file(s)${DRY_RUN ? ' (dry run)' : ''}...\n`);

// 3. Convert each
for (const yamlPath of allYamls) {
  const isRoot = yamlPath === join(ROOT, 'package.yaml');
  const rel    = yamlPath.replace(ROOT + '/', '');

  let pkg;
  try {
    // js-yaml resolves YAML anchors automatically — &ag / *ag etc. become their literal values
    pkg = yaml.load(readFileSync(yamlPath, 'utf8'));
  } catch (err) {
    console.error(`  ERROR parsing ${rel}: ${err.message}`);
    continue;
  }

  // 4. Strip workspace: from dependency versions
  stripWorkspaceDeps(pkg);

  // 5. Root-specific transformations
  if (isRoot) {
    adaptRoot(pkg, workspaceGlobs);
  }

  // 6. Write package.json
  writePackageJson(yamlPath, pkg);
}

console.log(DRY_RUN ? '\nDry run complete — no files written.' : '\nDone.');
