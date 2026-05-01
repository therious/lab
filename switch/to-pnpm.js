// to-pnpm.js
//
// Reverts the monorepo to pnpm mode:
//   - Removes generated package.json files (those sitting alongside a package.yaml)
//   - Restores real package.json files patched by to-npm.js via `git checkout`
//   - Wipes all node_modules
//
// Run from the switch/ directory:
//   npm run to-pnpm        (after: cd .. && pnpm install)
//   node to-pnpm.js
//
// package.yaml files are never touched — they are always the source of truth.

import { rmSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { globSync } from 'glob';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const wsConfig    = yaml.load(readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8'));
const workspaceGlobs = wsConfig.packages ?? [];
const memberYamls = workspaceGlobs
  .filter(g => !g.startsWith('!'))
  .flatMap(g => globSync(`${g}/package.yaml`, { cwd: ROOT, absolute: true }));

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

// ── Restore real package.json files patched by to-npm.js ─────────────────────
// These are committed with workspace: protocol; git checkout restores that form.

const yamlDirs = new Set(allYamls.map(p => dirname(p)));

const realPkgJsons = workspaceGlobs
  .filter(g => !g.startsWith('!'))
  .flatMap(g => globSync(`${g}/package.json`, { cwd: ROOT, absolute: true }))
  .filter(p => !yamlDirs.has(dirname(p)));

if (realPkgJsons.length > 0) {
  console.log('\nRestoring patched package.json files via git checkout...\n');
  const rel = realPkgJsons.map(p => p.replace(ROOT + '/', ''));
  try {
    execSync(`git checkout -- ${rel.join(' ')}`, { cwd: ROOT, stdio: 'inherit' });
    for (const r of rel) console.log(`  restored  ${r}`);
  } catch {
    console.warn('  ⚠  git checkout failed — files may already be clean or git not available');
  }
}

// ── Wipe node_modules ─────────────────────────────────────────────────────────

console.log('\nRemoving node_modules...\n');

const moduleDirs = globSync('**/node_modules', {
  cwd:      ROOT,
  absolute: true,
  ignore:   ['**/node_modules/**', 'switch/**'],  // leave switch's own intact
});

for (const dir of moduleDirs) {
  rmSync(dir, { recursive: true, force: true });
  console.log(`  removed  ${dir.replace(ROOT + '/', '')}`);
}

console.log('\nDone. Next: cd .. && pnpm install\n');
