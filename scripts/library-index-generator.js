const path = require('path');
const fs = require('fs');
const minimist = require('minimist'); // a minimist argument processing lib
const indexGenerate = require('./index-generator');

function getGitIgnoredLibraryIndexFiles() {
  const regex = /^libs\/(?<libname>.*)\/index\.(?<extension>ts|tsx|js|jsx)$/;
    return fs
    .readFileSync(`${process.cwd()}/.gitignore`, 'utf8')
    .split ('\n')
    .filter(s => regex.test(s))
    .map   (s=>s.match(regex).groups.libname)
}

const shortLibNames = getGitIgnoredLibraryIndexFiles();  // e.g ['actions', 'utils', 'fsm', 'ddd']
const libFolders = shortLibNames.map(s=>`libs/${s}`);
const libSrcFolders = libFolders.map(path=>`${path}/src`);

function main()
{
  // process options
  const arguments = minimist(process.argv.slice(2)); // ignore first two arguments, node filename
  const watch = 'watch' in arguments;
  console.log(`==== Generating Index Files for [${shortLibNames.join(', ')}] ====`);
  libSrcFolders.forEach(folder=>safeGenerateIndex(path.dirname(folder)));

  if(watch)
    startLibWatch();
}

function safeGenerateIndex(folderRoot)
{
  try      { indexGenerate(folderRoot) }
  catch(e) { console.log(e)            }
}

function startLibWatch()
{
  const chokidar = require('chokidar');
  console.log(`watching....`);

  // consolidate ignore lists for watching also with internal index-generator list
  // Exclude test files from watching to avoid unnecessary index regenerations
  const watcher = chokidar.watch(libSrcFolders, {
    persistent: true, 
    ignored: [
      '**/node_modules/**', 
      '**/*.html', 
      '**/*.css',
      '**/*.yaml',
      '**/__tests__/**',
      '**/__mocks__/**',
      '**/*.spec.js',
      '**/*.spec.ts',
      '**/*.spec.jsx',
      '**/*.spec.tsx',
      '**/*.test.js',
      '**/*.test.ts',
      '**/*.test.jsx',
      '**/*.test.tsx',
      '**/coverage/**'
    ]
  });

  let scanComplete;
  watcher
  .on('ready', ()=>scanComplete = true)
  .on('all',   (event, path)=>{
    if(!scanComplete || event === 'change') return;

    const root = path?.split('\\')[0];
    console.log(`---Event: ${event} File path: ${path} ---- generating index file for ${root}`);
    safeGenerateIndex(root);
  });
}


// run
main();
