#!/usr/bin/env node
/**
 * Generate BuildInfo.json for React UI
 * 
 * Captures:
 * - First 8 digits of latest commit hash
 * - Branch name
 * - Authored date
 * - Commit date
 * - Build date (with time)
 * - Mnemonic name (3-word bip39 phrase from commit hash)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function reverseString(str) {
  return str.split('').reverse().join('');
}

function getBip39WordList() {
  try {
    const bip39Path = path.join(__dirname, '../../../libs/utils/src/bip39.ts');
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
    const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    const shortHash = commitHash.substring(0, 8);
    
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    
    const authorDate = execSync('git log -1 --format=%ai', { encoding: 'utf-8' }).trim();
    const commitDate = execSync('git log -1 --format=%ci', { encoding: 'utf-8' }).trim();
    
    // Generate 3-word mnemonic from commit hash
    const wordList = getBip39WordList();
    const mnemonic = hashToMnemonic(shortHash, wordList, 3) || 'unknown-unknown-unknown';
    
    return {
      commitHash: shortHash,
      branch,
      authorDate,
      commitDate,
      mnemonic
    };
  } catch (error) {
    console.warn('Warning: Could not get git info:', error.message);
    return {
      commitHash: 'unknown',
      branch: 'unknown',
      authorDate: new Date().toISOString(),
      commitDate: new Date().toISOString(),
      mnemonic: 'unknown-unknown-unknown'
    };
  }
}

function generateBuildInfo() {
  const gitInfo = getGitInfo();
  const buildDate = new Date().toISOString();
  
  const buildInfo = {
    commitHash: gitInfo.commitHash,
    branch: gitInfo.branch,
    authorDate: gitInfo.authorDate,
    commitDate: gitInfo.commitDate,
    buildDate: buildDate,
    mnemonic: gitInfo.mnemonic
  };
  
  // Write to src directory so it can be imported
  const outputPath = path.join(__dirname, '../src/build-info.json');
  fs.writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));
  
  console.log('BuildInfo.json generated:', buildInfo);
  return buildInfo;
}

if (require.main === module) {
  generateBuildInfo();
}

module.exports = { generateBuildInfo };
