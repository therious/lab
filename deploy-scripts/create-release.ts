#!/usr/bin/env ts-node
/**
 * Create a release based on the main branch
 *
 * Creates an annotated tag for a release with:
 * - r- prefix (instead of d- for deployments)
 * - No branch name in the tag (releases are from main)
 * - 8-character commit hash
 * - BIP39 mnemonic
 *
 * Tag format: r-<timestamp>-<8-char-commit-hash>-<bip39-mnemonic>
 *
 * Usage: ts-node create-release.ts <message>
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { hashToWords } from '../libs/utils/src/bip39';

// Find repository root
function findRepoRoot(startPath: string): string {
  let current = path.resolve(startPath);
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, '.git'))) {
      return current;
    }
    current = path.dirname(current);
  }
  throw new Error('Could not find repository root (no .git directory found)');
}

// Get directory of current script file
// In CommonJS (ts-node default), __dirname is available
declare const __dirname: string;
const scriptDir = __dirname;
const REPO_ROOT = findRepoRoot(scriptDir);

function execGit(command: string, cwd: string = REPO_ROOT): string {
  try {
    return execSync(command, { cwd, encoding: 'utf-8' }).trim();
  } catch (error) {
    const err = error as { message?: string; stderr?: Buffer };
    throw new Error(`Git command failed: ${command}\n${err.message || err.stderr?.toString() || 'Unknown error'}`);
  }
}

function missingRemoteBranch(branch: string): boolean {
  try {
    const result = execGit(`git ls-remote --heads origin ${branch}`);
    return result.length === 0;
  } catch {
    return true;
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: ts-node create-release.ts <message>');
    console.error('');
    console.error('where:');
    console.error('        <message> explains the purpose of this release');
    process.exit(1);
  }

  console.log('--- creating release ---');

  if (!fs.existsSync(path.join(REPO_ROOT, '.git'))) {
    console.error('Error: This script requires that you run from the root of a git project');
    process.exit(1);
  }

  try {
    execGit('git ls-remote origin --quiet');
  } catch {
    console.error('Error: This script requires that you have a *working* git remote called \'origin\'');
    process.exit(1);
  }

  const MESSAGE = args.join(' ');

  // Ensure we're on main branch or it exists on origin
  if (missingRemoteBranch('main')) {
    console.error('Error: main branch does not exist on origin');
    process.exit(1);
  }

  const GIT_ORIGIN_REPONAME = execGit('basename $(git remote show -n origin | grep Fetch | cut -d: -f2-)');

  // Confirmation prompt
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`Repo: '${GIT_ORIGIN_REPONAME}' Create release tag from main branch? [y/N] `, (answer: string) => {
    rl.close();
    if (!answer.match(/^[yY]([eE][sS])?$/)) {
      console.log('Exiting: User cancelled');
      process.exit(1);
    }

    // Fetch latest main
    console.log('Fetching latest main branch...');
    try {
      execGit('git fetch origin main:main');
    } catch (err) {
      console.error('Error: Could not fetch main branch');
      process.exit(1);
    }

    const COMMIT = execGit('git rev-parse main');
    const COMMIT_SHORT = COMMIT.substring(0, 8);

    const MYNAME = execGit('git config --get user.name');
    const MYEMAIL = execGit('git config --get user.email');
    const DT = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const TAG_DT = DT.replace(/[:-]/g, '').replace(' ', '-');

    // Generate BIP39 mnemonic (3 words, joined with hyphens for tag compatibility)
    const mnemonicPhrase = hashToWords(COMMIT_SHORT, 8) || 'unknown';
    const mnemonic = mnemonicPhrase.split(' ').slice(0, 3).join('-'); // Take first 3 words, join with hyphens
    const TAG_NAME = `r-${TAG_DT}-${COMMIT_SHORT}-${mnemonic}`;

    const ANNOTATION = `Release ${COMMIT_SHORT}
-
  who: ${MYNAME} <${MYEMAIL}>
 when: ${DT} (UTC)
 what: release from main@${COMMIT_SHORT}
  why: ${MESSAGE}
  how: create-release.ts created release tag
  mnemonic: ${mnemonic}`;

    console.log(`Creating release tag ${TAG_NAME}`);

    try {
      execGit(`git tag -a "${TAG_NAME}" main --cleanup=verbatim -m "${ANNOTATION}"`);
      execGit(`git push --quiet origin ${TAG_NAME}`);
      console.log('Release tag created and pushed successfully!');
      console.log(`Tag: ${TAG_NAME}`);
      console.log(`Commit: ${COMMIT_SHORT}`);
      console.log(`Mnemonic: ${mnemonic}`);
    } catch (err) {
      console.error('Error during release creation:', (err as Error).message);
      process.exit(1);
    }
  });
}

if (require.main === module) {
  main();
}

