import "reflect-metadata";
import { injectable, inject } from "@therious/boot";
import type { Page } from "puppeteer";
import { IScraper } from "../IScraper";

/**
 * Result object from Pealim scraping
 */
export interface PealimResult {
  word: string;
  part: string;
  meaning: string;
}

/**
 * Pealim scraper implementation.
 * Scrapes Hebrew word data from pealim.com dictionary pages.
 */
@injectable()
export class PealimScraper implements IScraper {
  private readonly baseUrl: string;

  constructor(@inject("baseUrl") baseUrl?: string) {
    this.baseUrl = baseUrl || "https://www.pealim.com";
  }

  /**
   * Transforms a 3-letter Hebrew root into a Pealim search URL.
   * @param parameter - A 3-letter Hebrew root (e.g., "פעל")
   * @returns The complete URL to scrape
   */
  parameterToUrl(parameter: string): string {
    if (parameter.length !== 3) {
      throw new Error(`Root must be exactly 3 letters, got: ${parameter}`);
    }

    const r1 = encodeURIComponent(parameter[0]);
    const r2 = encodeURIComponent(parameter[1]);
    const rf = encodeURIComponent(parameter[2]);

    return `${this.baseUrl}/dict/?pos=all&num-radicals=3&r1=${r1}&r2=${r2}&rf=${rf}`;
  }

  /**
   * Scrapes results from a loaded Pealim page.
   * Extracts word data from the dict-table.
   * @param page - The Puppeteer page object with the loaded DOM
   * @returns An array of result objects with word, part, and meaning
   */
  async scrapeResults(page: Page): Promise<PealimResult[]> {
    // Extract data from the dict-table
    const results = await page.evaluate(() => {
      // Debug: log page info
      const debug: string[] = [];
      debug.push(`Page title: ${document.title}`);
      debug.push(`Page URL: ${window.location.href}`);
      
      // Check for table - Pealim uses "dict-table-t" class
      const table = document.querySelector("table.dict-table-t") || 
                    document.querySelector("table.dict-table") ||
                    document.querySelector("table[class*='dict-table']");
      debug.push(`Found dict-table: ${!!table}`);
      
      if (!table) {
        // Try to find any table for debugging
        const allTables = document.querySelectorAll("table");
        debug.push(`Total tables on page: ${allTables.length}`);
        allTables.forEach((t, i) => {
          debug.push(`Table ${i}: classes="${t.className}"`);
        });
        return { results: [], debug };
      }
      
      const tableToUse = table;
      if (!tableToUse) {
        return { results: [], debug };
      }

      const rows = Array.from(tableToUse.querySelectorAll("tbody tr"));
      debug.push(`Found ${rows.length} rows in tbody`);
      
      // If no tbody rows, try all rows
      const allRows = rows.length === 0 
        ? Array.from(tableToUse.querySelectorAll("tr"))
        : rows;
      debug.push(`Using ${allRows.length} total rows`);
      
      const data: Array<{ word: string; part: string; meaning: string }> = [];

      for (const row of allRows) {
        const cells = row.querySelectorAll("td");
        if (cells.length < 4) continue; // Need at least 4 columns: word, root, part, meaning

        // Extract word from first column (index 0): <td><a><div><div><span class="menukad">
        let word = "";
        const wordCell = cells[0];
        const menukadSpan = wordCell?.querySelector("span.menukad");
        if (menukadSpan) {
          word = menukadSpan.textContent?.trim() || "";
        }

        // Extract part from third column (index 2): "part of speech"
        // Text content excluding anchor tags
        let part = "";
        const partCell = cells[2];
        if (partCell) {
          // Clone the cell to avoid modifying the original
          const clone = partCell.cloneNode(true) as HTMLElement;
          // Remove all anchor tags
          const anchors = clone.querySelectorAll("a");
          anchors.forEach((anchor) => anchor.remove());
          part = clone.textContent?.trim() || "";
        }

        // Extract meaning from fourth column (index 3): <td class="dict-meaning">
        let meaning = "";
        const meaningCell = cells[3];
        if (meaningCell && meaningCell.classList.contains("dict-meaning")) {
          meaning = meaningCell.textContent?.trim() || "";
        }

        // Only add if we have at least a word
        if (word) {
          data.push({ word, part, meaning });
        }
      }

      return data;
    });

    return results;
  }
}
