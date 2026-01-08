#!/usr/bin/env node
/**
 * Generic BuildInfo.json generator for React UI apps
 * 
 * Works from any app directory in the monorepo.
 * Generates build-info.json in the app's src/ directory.
 * 
 * Captures:
 * - First 8 digits of latest commit hash
 * - Branch name
 * - Authored date (ISO string, UTC)
 * - Committed date (ISO string, UTC)
 * - Built date (ISO string, UTC)
 * - Mnemonic name (3-word bip39 phrase from commit hash)
 * 
 * Usage:
 *   node scripts/generate-build-info.js [appDir]
 *   If appDir is not provided, detects from current working directory
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Determine app directory
const appDir = process.argv[2] || process.cwd();
const appDirPath = path.resolve(appDir);

// Determine repo root (traverse up until .git found)
function findRepoRoot(startPath) {
  let current = path.resolve(startPath);
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, '.git'))) {
      return current;
    }
    current = path.dirname(current);
  }
  throw new Error('Could not find repository root (no .git directory found)');
}

const REPO_ROOT = findRepoRoot(appDirPath);

function reverseString(str) {
  return str.split('').reverse().join('');
}

function getBip39WordList() {
  try {
    const bip39Path = path.join(REPO_ROOT, 'libs/utils/src/bip39.ts');
    if (!fs.existsSync(bip39Path)) {
      return null;
    }
    const content = fs.readFileSync(bip39Path, 'utf-8');
    // Extract word list - match the array definition
    const match = content.match(/const bip39WordList = \[([\s\S]*?)\];/);
    if (!match) {
      return null;
    }
    // Parse the array content - split by comma and clean up
    const words = match[1]
      .split(',')
      .map(w => w.trim().replace(/^["']|["']$/g, ''))
      .filter(w => w.length > 0);
    return words;
  } catch (err) {
    console.warn('Warning: Could not load bip39 word list:', err.message);
    return null;
  }
}

function hashToMnemonic(hash, wordList, wordCount = 3) {
  if (!wordList || wordList.length === 0) {
    return null;
  }
  try {
    const reversedHash = reverseString(hash);
    const number = BigInt(`0x${reversedHash}`);
    const mnemonicWords = [];
    let tempNumber = number;
    let count = 0;
    
    while (tempNumber > 0 && count < wordCount) {
      const wordIndex = Number(tempNumber & BigInt(0x7FF)); // 11 bits = 0-2047
      if (wordIndex < wordList.length) {
        mnemonicWords.push(wordList[wordIndex]);
        count++;
      }
      tempNumber = tempNumber >> BigInt(11);
    }
    
    return mnemonicWords.length > 0 ? mnemonicWords.join('-') : null;
  } catch (err) {
    console.warn('Warning: Could not generate mnemonic:', err.message);
    return null;
  }
}

function getGitInfo() {
  try {
    // Always run git commands from repo root to ensure consistency
    const commitHash = execSync('git rev-parse HEAD', { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
    const shortHash = commitHash.substring(0, 8);
    
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
    
    // Get dates as ISO strings (UTC)
    const authorDate = execSync('git log -1 --format=%aI', { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
    const commitDate = execSync('git log -1 --format=%cI', { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
    
    // Generate 3-word mnemonic from commit hash
    const wordList = getBip39WordList();
    const mnemonic = hashToMnemonic(shortHash, wordList, 3) || 'unknown-unknown-unknown';
    
    return {
      commitHash: shortHash,
      branch,
      authoredDate: authorDate,
      committedDate: commitDate,
      mnemonic
    };
  } catch (error) {
    console.warn('Warning: Could not get git info:', error.message);
    const now = new Date().toISOString();
    return {
      commitHash: 'unknown',
      branch: 'unknown',
      authoredDate: now,
      committedDate: now,
      mnemonic: 'unknown-unknown-unknown'
    };
  }
}

function generateBuildInfo() {
  const gitInfo = getGitInfo();
  const builtDate = new Date().toISOString();
  
  const buildInfo = {
    commitHash: gitInfo.commitHash,
    branch: gitInfo.branch,
    authoredDate: gitInfo.authoredDate,
    committedDate: gitInfo.committedDate,
    builtDate: builtDate,
    mnemonic: gitInfo.mnemonic
  };
  
  // Ensure src directory exists
  const srcDir = path.join(appDirPath, 'src');
  if (!fs.existsSync(srcDir)) {
    throw new Error(`Source directory not found: ${srcDir}`);
  }
  
  // Write to src directory so it can be imported
  const outputPath = path.join(srcDir, 'build-info.json');
  fs.writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));
  
  console.log('BuildInfo.json generated:', outputPath);
  return buildInfo;
}

if (require.main === module) {
  try {
    generateBuildInfo();
  } catch (error) {
    console.error('Error generating build info:', error.message);
    process.exit(1);
  }
}

module.exports = { generateBuildInfo };

