import "reflect-metadata";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { Config, Inflate, container } from "@therious/boot";
import { IScraper } from "./src/IScraper";
import { loadPageWithPuppeteer } from "./src/utils/puppeteerLoader";

// Import scrapers so they're registered with tsyringe
import { DuckDuckGoScraper } from "./src/scrapers/DuckDuckGoScraper";
import { PealimScraper } from "./src/scrapers/PealimScraper";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration file path - can be overridden with command line arg
const DEFAULT_CONFIG_FILE = path.join(__dirname, "config", "config.yaml");
const OUTPUT_FILE = path.join(__dirname, "results.yaml");

interface ScraperConfig {
  scraper: string; // Name of the scraper singleton (e.g., "DuckDuckGoScraper")
  delayMs: number;
  parameters?: string[]; // For DuckDuckGo-style scrapers
  roots?: string[]; // For Pealim scraper (Hebrew roots)
  baseUrl?: string; // Optional base URL for the scraper
  bootSequence?: string[]; // Optional boot sequence for Inflate
  fromIndex?: number; // Starting index (default: 0)
  iterations?: number; // Number of items to process (-1 for all remaining, default: all)
  waitForSelector?: string; // Selector to wait for when loading pages
}

// Load existing results from YAML file
function loadResults(): Record<string, any> {
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      const fileContents = fs.readFileSync(OUTPUT_FILE, "utf8");
      const data = yaml.load(fileContents) as Record<string, any>;
      return data || {};
    }
  } catch (error) {
    console.error("Error loading results file:", error);
  }
  return {};
}

// Save results to YAML file
function saveResults(results: Record<string, any>): void {
  try {
    const yamlStr = yaml.dump(results, { indent: 2 });
    fs.writeFileSync(OUTPUT_FILE, yamlStr, "utf8");
    console.log(`Results saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error("Error saving results file:", error);
  }
}

// Delay function
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Main scraping function
async function main(): Promise<void> {
  console.log("Starting scraper...");

  try {
    // Get config file from command line arg or use default
    const configFile = process.argv[2] || DEFAULT_CONFIG_FILE;
    
    // Load configuration directly from file system to avoid import.meta.env issues
    // Then use Inflate to set up dependency injection
    console.log(`Loading config from ${configFile}`);
    if (!fs.existsSync(configFile)) {
      throw new Error(`Config file not found: ${configFile}`);
    }
    const configFileContents = fs.readFileSync(configFile, "utf8");
    const config: ScraperConfig = yaml.load(configFileContents) as ScraperConfig;
    
    if (!config.scraper) {
      throw new Error("Invalid configuration format: missing 'scraper'");
    }

    // Support both 'parameters' and 'roots' for different scraper types
    const items = config.roots || config.parameters || [];
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Invalid configuration format: missing 'parameters' or 'roots'");
    }

    console.log("Config loaded:", {
      scraper: config.scraper,
      itemCount: items.length,
      fromIndex: config.fromIndex ?? 0,
      iterations: config.iterations ?? -1,
    });

    // Use Inflate to register tokens and resolve dependencies
    const inflate = new Inflate(config as any);
    
    // Register scraper classes with their names as tokens
    container.register<IScraper>("DuckDuckGoScraper", { useClass: DuckDuckGoScraper });
    container.register<IScraper>("PealimScraper", { useClass: PealimScraper });
    
    if (config.bootSequence) {
      inflate.intializeSequence("bootSequence");
    }

    // Resolve the scraper instance
    // The scraper will be resolved with baseUrl injected if provided in config
    const scraper = container.resolve<IScraper>(config.scraper);

    if (!scraper) {
      throw new Error(
        `Failed to resolve scraper "${config.scraper}". Make sure it's registered with @injectable() and imported.`
      );
    }

    // Determine which items to process
    const fromIndex = config.fromIndex ?? 0;
    const iterations = config.iterations ?? -1;
    const endIndex = iterations === -1 
      ? items.length 
      : Math.min(fromIndex + iterations, items.length);
    const itemsToProcess = items.slice(fromIndex, endIndex);

    console.log(`Using scraper: ${config.scraper}`);
    console.log(`Processing items ${fromIndex} to ${endIndex - 1} (${itemsToProcess.length} total)`);
    console.log(`Delay between requests: ${config.delayMs}ms`);
    console.log(`Output file: ${OUTPUT_FILE}`);
    console.log("");

    let results = loadResults();

    for (let i = 0; i < itemsToProcess.length; i++) {
      const parameter = itemsToProcess[i];
      console.log(`\nProcessing parameter [${fromIndex + i}]: ${parameter}`);

      // Skip if already processed
      if (results[parameter] && (Array.isArray(results[parameter]) ? results[parameter].length > 0 : true)) {
        console.log(`  Already has results, skipping...`);
        continue;
      }

      // Generate URL using the scraper
      const url = scraper.parameterToUrl(parameter);

      // Load the page using Puppeteer
      // Use config-specific wait selector or default based on scraper type
      const defaultWaitSelector = config.scraper === "PealimScraper" 
        ? "table[class*='dict-table']" 
        : 'div.g, a[href^="/url"]';
      const waitSelector = config.waitForSelector || defaultWaitSelector;

      const { browser, page } = await loadPageWithPuppeteer(url, {
        waitForSelector: waitSelector,
        takeScreenshot: !!process.env.DEBUG,
      });

      try {
        // Scrape results using the scraper (page is already loaded)
        const scrapedResults = await scraper.scrapeResults(page);

        // Store results
        results[parameter] = scrapedResults;

        // Save after each iteration
        saveResults(results);

        console.log(`  Found ${scrapedResults.length} results`);
        if (Array.isArray(scrapedResults) && scrapedResults.length > 0) {
          // Display first few results
          const displayCount = Math.min(3, scrapedResults.length);
          for (let j = 0; j < displayCount; j++) {
            const result = scrapedResults[j];
            if (typeof result === "string") {
              console.log(`    ${j + 1}. ${result}`);
            } else if (result && typeof result === "object") {
              console.log(`    ${j + 1}. ${JSON.stringify(result).substring(0, 100)}...`);
            }
          }
          if (scrapedResults.length > displayCount) {
            console.log(`    ... and ${scrapedResults.length - displayCount} more`);
          }
        }
      } finally {
        // Always close the browser
        await browser.close();
      }

      // Delay before next iteration (except for the last one)
      if (i < itemsToProcess.length - 1) {
        console.log(`  Waiting ${config.delayMs}ms before next request...`);
        await delay(config.delayMs);
      }
    }

    console.log("\nScraping complete!");
    console.log(`Final results saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error("Fatal error:", error);
    throw error;
  }
}

// Run the scraper
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
