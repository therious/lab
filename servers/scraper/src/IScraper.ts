import type { Page } from "puppeteer";

/**
 * Interface for web scrapers that can transform parameters into URLs
 * and scrape results from loaded pages.
 */
export interface IScraper {
  /**
   * Transforms a parameter into a complete URL for scraping.
   * @param parameter - The search parameter (e.g., "apple", "banana")
   * @returns The complete URL to scrape
   */
  parameterToUrl(parameter: string): string;

  /**
   * Scrapes results from a loaded page.
   * The page should already be loaded and ready for scraping.
   * @param page - The Puppeteer page object with the loaded DOM
   * @returns An array of results (can be URLs as strings or objects with structured data)
   */
  scrapeResults(page: Page): Promise<any[]>;
}

