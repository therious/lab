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
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getGitInfo() {
  try {
    const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    const shortHash = commitHash.substring(0, 8);
    
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    
    const authorDate = execSync('git log -1 --format=%ai', { encoding: 'utf-8' }).trim();
    const commitDate = execSync('git log -1 --format=%ci', { encoding: 'utf-8' }).trim();
    
    return {
      commitHash: shortHash,
      branch,
      authorDate,
      commitDate
    };
  } catch (error) {
    console.warn('Warning: Could not get git info:', error.message);
    return {
      commitHash: 'unknown',
      branch: 'unknown',
      authorDate: new Date().toISOString(),
      commitDate: new Date().toISOString()
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
    buildDate: buildDate
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
