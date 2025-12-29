import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the root dictionary file
const DICTIONARY_FILE = path.join(__dirname, "../../../apps/roots/public/root-dictionary-definitions.yaml");
const OUTPUT_FILE = path.join(__dirname, "../config/pealim-config.yaml");

interface RootEntry {
  id: number;
  root: string;
  def?: string;
  eg?: any[];
}

interface DictionaryData {
  roots: RootEntry[];
}

// Load dictionary and extract roots
const fileContents = fs.readFileSync(DICTIONARY_FILE, "utf8");
const data = yaml.load(fileContents) as DictionaryData;

if (!data || !data.roots || !Array.isArray(data.roots)) {
  throw new Error("Invalid dictionary file format");
}

// Extract just the root strings (3 Hebrew letters)
const roots = data.roots
  .map(entry => entry.root)
  .filter(root => root && root.length === 3); // Only 3-letter roots

console.log(`Extracted ${roots.length} roots from dictionary`);

// Create config
const config = {
  scraper: "PealimScraper",
  baseUrl: "https://www.pealim.com",
  delayMs: 2000,
  roots: roots,
  fromIndex: 0,
  iterations: 3, // Process first 3 roots
  bootSequence: ["PealimScraper"],
};

// Write config file
const yamlStr = yaml.dump(config, { indent: 2 });
fs.writeFileSync(OUTPUT_FILE, yamlStr, "utf8");

console.log(`Created pealim-config.yaml with ${roots.length} roots`);
console.log(`Config written to: ${OUTPUT_FILE}`);

