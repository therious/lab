import "reflect-metadata";
import { injectable, inject } from "@therious/boot";
import type { Page } from "puppeteer";
import { IScraper } from "../IScraper";
import { SerializableExtractionConfig } from "../utils/domExtraction";

@injectable()
export class DuckDuckGoScraper implements IScraper {
  private readonly baseUrl: string;

  constructor(@inject("baseUrl") baseUrl?: string) {
    this.baseUrl = baseUrl || "https://duckduckgo.com";
  }

  parameterToUrl(parameter: string): string {
    const searchQuery = encodeURIComponent(parameter);
    return `${this.baseUrl}/?q=${searchQuery}`;
  }

  async scrapeResults(page: Page): Promise<string[]> {
    // Configure URL extraction for DuckDuckGo
    const extractionConfig: SerializableExtractionConfig = {
      selectors: [
        'a[data-testid="result-title-a"]',
        "a.result__a",
        "a.result-link",
        "a.web-result",
        "div.result a",
        'a[class*="result"]',
        'article[data-testid="result"] a',
        'a[href^="http"]:not([href*="duckduckgo"])',
      ],
      maxResults: 3,
      excludedHostnames: ["duckduckgo.com", "duck.com"],
    };

    // Extract URLs from the DOM
    // The extraction logic runs in the browser context via page.evaluate()
    const pageInfo = await page.evaluate((config: SerializableExtractionConfig) => {
      // This runs in the browser context, so we have access to DOM APIs
      const urls: string[] = [];
      const seen = new Set<string>();
      const debug: string[] = [];

      // Debug: check what's on the page
      debug.push(`Page title: ${document.title}`);
      debug.push(
        `Body text length: ${document.body?.textContent?.length || 0}`
      );

      const maxResults = config.maxResults || 3;

      // Try each selector in order
      for (const selector of config.selectors) {
        if (urls.length >= maxResults) break;

        const links = document.querySelectorAll<HTMLAnchorElement>(selector);
        debug.push(`Selector "${selector}" found ${links.length} elements`);

        for (const link of Array.from(links)) {
          if (urls.length >= maxResults) break;

          let href = link.href || link.getAttribute("href") || "";

          if (!href) continue;

          // Validate URL
          if (!href.startsWith("http://") && !href.startsWith("https://")) {
            continue;
          }

          // Filter URL (check excluded hostnames)
          let shouldInclude = true;
          if (config.excludedHostnames && config.excludedHostnames.length > 0) {
            try {
              const urlObj = new URL(href);
              shouldInclude = !config.excludedHostnames.some((excluded: string) =>
                urlObj.hostname.includes(excluded)
              );
            } catch {
              shouldInclude = false;
            }
          }

          if (!shouldInclude) {
            continue;
          }

          // Check for duplicates
          if (seen.has(href)) {
            continue;
          }

          // Validate URL object
          try {
            new URL(href);
            urls.push(href);
            seen.add(href);
          } catch {
            // Invalid URL, skip
            debug.push(`Invalid URL skipped: ${href.substring(0, 80)}`);
          }
        }
      }

      return { urls, debug };
    }, extractionConfig);

    if (process.env.DEBUG) {
      console.log("  Debug info:", pageInfo.debug?.join("; "));
    }

    return pageInfo.urls;
  }
}
