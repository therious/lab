const glob = require('glob');
const fs = require('fs');
const path = require('path');


const ignoredByDefault = [
'**/node_modules/**',
'**/.git/**',
'**/dist/**',
'**/docs/**',
'webpack*\.js/**', // this glob looks wrong
'package\.json',
'package.yaml',
'index\.js',
'index\.ts',
'**/*\.d\.ts',
'index-generator.js',
'**/__mocks__/**',
'coverage/**',
];

// creates an index.ts for a module
const indexGenerate = function(folder, additionalLines=[], fileName='index.ts', ignored=ignoredByDefault)
{
  const prevDir = process.cwd();
  process.chdir(folder);
  const file = path.resolve(fileName);
  const indexFile = fs.createWriteStream(file);
  indexFile.on('error', err=>{console.log(err)});
  const dateStr = (new Date()).toLocaleString();
  indexFile.write(`// ====== generated on ${dateStr} by therious index-generator.js ======\r\n`);

  const syncOptions = {ignore:ignored};

  const tsfiles = glob.sync('**/*.ts',syncOptions);
  const jsfiles = glob.sync('**/*.js', syncOptions);  // this has some index.d.ts issues

  [...tsfiles, ...jsfiles].forEach((file)=>indexFile.write(`export * from './${file.slice(0,-3)}';\r\n`));
  indexFile.end();
  process.chdir(prevDir);
};
module.exports = indexGenerate;
