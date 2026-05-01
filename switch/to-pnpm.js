// to-pnpm.js
//
// Reverts the monorepo to pnpm mode:
//   - Removes generated package.json files (those sitting alongside a package.yaml)
//   - Restores real package.json files patched by to-npm.js from switch/.originals.json
//   - Wipes all node_modules
//
// Run from the switch/ directory:
//   npm run to-pnpm        (after: cd .. && pnpm install)
//   node to-pnpm.js
//
// package.yaml files are never touched — they are always the source of truth.

import { rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { globSync } from 'glob';

const ROOT       = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SWITCH_DIR = dirname(fileURLToPath(import.meta.url));
const ORIGINALS  = join(SWITCH_DIR, '.originals.json');

const wsConfig       = yaml.load(readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8'));
const workspaceGlobs = wsConfig.packages ?? [];
const memberYamls    = workspaceGlobs
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
// Originals were saved to switch/.originals.json before patching.

if (existsSync(ORIGINALS)) {
  console.log('\nRestoring patched package.json files from switch/.originals.json...\n');
  const originals = JSON.parse(readFileSync(ORIGINALS, 'utf8'));
  for (const [rel, content] of Object.entries(originals)) {
    writeFileSync(join(ROOT, rel), content, 'utf8');
    console.log(`  restored  ${rel}`);
  }
  rmSync(ORIGINALS);
  console.log('\nOriginals restored and switch/.originals.json removed.');
} else {
  console.log('\nNo switch/.originals.json found — nothing to restore.');
}

// ── Wipe node_modules ─────────────────────────────────────────────────────────

console.log('\nRemoving node_modules...\n');

const moduleDirs = globSync('**/node_modules', {
  cwd:      ROOT,
  absolute: true,
  ignore:   ['switch/**'],  // leave switch's own node_modules intact
});

for (const dir of moduleDirs) {
  rmSync(dir, { recursive: true, force: true });
  console.log(`  removed  ${dir.replace(ROOT + '/', '')}`);
}

console.log('\nDone. Next: cd .. && pnpm install\n');
