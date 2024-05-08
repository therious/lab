import * as fs from 'fs'
import * as yaml from 'js-yaml';

// Get the command line arguments
const [arg0, arg1, inputYamlFilePath, outputFilePath] = process.argv;
// Check if the number of arguments is correct
if (process.argv.length !== 5) {
  console.error('Usage: ts-node package-yaml-to-json.ts input.yaml output.json');
  process.exit(1);
}

const yamlContent = fs.readFileSync(inputYamlFilePath, 'utf8');
const parsedYaml = yaml.load(yamlContent);
const jsonContent = JSON.stringify(parsedYaml, null, 2);

// Add a comment at the top explaining that this is a generated file
const generatedComment = `// This file is generated automatically at ${new Date().toISOString()}\n`;

const output = generatedComment + jsonContent;
console.log(output);
fs.writeFileSync(outputFilePath, output);

console.log('package.json file generated successfully!');
