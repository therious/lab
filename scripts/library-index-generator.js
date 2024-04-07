const path = require('path');
const minimist = require('minimist'); // a minimist argument processing lib
const indexGenerate = require('./index-generator');


const shortLibNames = ['actions', 'fsm', 'utils'];  // todo generate this list
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

  // consolidate ignore lists for watching also with internal index-generator list
  watcher = chokidar.watch(libSrcFolders, {persistent:true, ignored: ['**/node_modules/**', '**/*.html', '**/*.css',]});

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
