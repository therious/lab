#!/usr/bin/env ts-node
/**
 * TypeScript version of deploy-as-branch.sh
 *
 * Deploys a source branch to a target branch by:
 * 1. Fetching the source branch from origin
 * 2. Creating an annotated tag with deployment info
 * 3. Force-pushing the source branch to the target branch
 * 4. Pushing the tag to origin
 *
 * Tag format: d-<target-branch>-<timestamp>-<8-char-commit-hash>-<bip39-mnemonic>
 *
 * Usage: ts-node deploy-as-branch.ts <src-branch> <target-branch> <message>
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

function missingLocalBranch(branch: string): boolean {
  try {
    const result = execGit(`git branch --list ${branch}`);
    return result.length === 0;
  } catch {
    return true;
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: ts-node deploy-as-branch.ts <src-branch> <target-branch> <message>');
    console.error('');
    console.error('where:');
    console.error('        <src-branch> exists on origin');
    console.error('        <target-branch> presumably exists on origin as a deployment target branch');
    console.error('        <message> explains motivation for deployment');
    process.exit(1);
  }

  console.log('--- let\'s do this ---');

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

  const O_SRC = args[0];
  const O_TGT = args[1];
  const MESSAGE = args.slice(2).join(' ');

  // Sanity checks
  if (O_TGT === 'main') {
    console.error('Error: deploying to branch \'main\' is a no-no');
    process.exit(1);
  }

  if (O_TGT === O_SRC) {
    console.error(`Error: deploying '${O_TGT}' to itself sounds just wrong`);
    process.exit(1);
  }

  const GIT_ORIGIN_REPONAME = execGit('basename $(git remote show -n origin | grep Fetch | cut -d: -f2-)');

  // Confirmation prompt
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`Repo: '${GIT_ORIGIN_REPONAME}' Set origin '${O_TGT}' to be identical to origin '${O_SRC}'? [y/N] `, (answer: string) => {
    rl.close();
    if (!answer.match(/^[yY]([eE][sS])?$/)) {
      console.log('Exiting: User cancelled');
      process.exit(1);
    }

    if (missingRemoteBranch(O_SRC)) {
      console.error(`Error: the remote branch you are using as a source (${O_SRC}) is missing`);
      process.exit(1);
    }

    const NNN = Date.now().toString();
    const L_SRC = `${O_SRC}-temp-${NNN}`;

    console.log(`Creating local branch '${L_SRC}'`);
    try {
      execGit(`git fetch origin ${O_SRC}:${L_SRC}`);
    } catch (err) {
      console.error('Error: Could not fetch source branch');
      process.exit(1);
    }

    if (missingLocalBranch(L_SRC)) {
      console.error(`Error: temporary local branch '${L_SRC}' could not be created`);
      process.exit(1);
    }

    const COMMIT = execGit(`git rev-parse ${L_SRC}`);
    const COMMIT_SHORT = COMMIT.substring(0, 8);

    // Check if deployment is a no-op
    try {
      const TGT_STAT = execGit('git ls-remote origin').split('\n').find(line => line.includes(`refs/heads/${O_TGT}$`));
      if (TGT_STAT && TGT_STAT.substring(0, 8) === COMMIT_SHORT) {
        console.error(`Error: Your target branch '${O_TGT}' is already set to COMMIT ${COMMIT_SHORT}`);
        console.error('Just to be clear, we aren\'t doing this, since it doesn\'t do anything');
        // Cleanup
        try {
          execGit(`git branch -D ${L_SRC}`);
        } catch {}
        process.exit(1);
      }
    } catch {}

    const MYNAME = execGit('git config --get user.name');
    const MYEMAIL = execGit('git config --get user.email');
    const DT = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const TAG_DT = DT.replace(/[:-]/g, '').replace(' ', '-');

    // Generate BIP39 mnemonic (3 words, joined with hyphens for tag compatibility)
    const mnemonicPhrase = hashToWords(COMMIT_SHORT, 8) || 'unknown';
    const mnemonic = mnemonicPhrase.split(' ').slice(0, 3).join('-'); // Take first 3 words, join with hyphens
    const TAG_NAME = `d-${O_TGT}-${TAG_DT}-${COMMIT_SHORT}-${mnemonic}`;

    const ANNOTATION = `${COMMIT_SHORT} has been "deployed" by resetting branch ${O_TGT}
-
  who: ${MYNAME} <${MYEMAIL}>
 when: ${DT} (UTC)
 what: "deployed" ${O_SRC}@${COMMIT_SHORT}
where: to branch ${O_TGT}
  why: ${MESSAGE}
  how: deploy-as-branch.ts pushed branch and tagged
  mnemonic: ${mnemonic}`;

    console.log(`Pushing branch ${O_TGT} and assigning tag ${TAG_NAME}`);

    try {
      execGit(`git tag -a "${TAG_NAME}" "${L_SRC}" --cleanup=verbatim -m "${ANNOTATION}"`);
      execGit(`git push --quiet --no-progress --force origin ${L_SRC}:${O_TGT}`);
      execGit(`git push --quiet origin ${TAG_NAME}`);
      console.log('Deployment successful!');
    } catch (err) {
      console.error('Error during deployment:', (err as Error).message);
      process.exit(1);
    } finally {
      // Cleanup
      try {
        execGit(`git branch -D ${L_SRC}`);
      } catch {}
      try {
        execGit(`git tag -d ${TAG_NAME}`);
      } catch {}
      console.log('-------- done -------');
    }
  });
}

if (require.main === module) {
  main();
}

