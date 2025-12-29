# Scraper Utilities

This directory contains shared utilities for web scraping that can be used by multiple scraper implementations.

## Architecture

The scraping process is separated into two concerns:

1. **Page Loading** (`puppeteerLoader.ts`): Handles loading pages with Puppeteer
2. **DOM Extraction** (`domExtraction.ts`): Provides utilities for extracting data from DOM trees

## Usage

### Loading a Page

```typescript
import { loadPageWithPuppeteer } from "./utils/puppeteerLoader";

const { browser, page } = await loadPageWithPuppeteer(url, {
  waitForSelector: 'div.results',
  takeScreenshot: true,
});

// Use the page...
await browser.close();
```

### Extracting URLs from DOM

The `extractUrlsFromDOM` function is designed to run in the browser context via `page.evaluate()`. Since functions can't be serialized, the extraction logic needs to be defined inline in the `page.evaluate()` callback.

However, you can use the configuration helpers:

```typescript
import { createHostnameFilter, createGoogleRedirectTransformer } from "./utils/domExtraction";

// In your scraper's scrapeResults method:
const pageInfo = await page.evaluate((config) => {
  // Extraction logic here (see DuckDuckGoScraper for example)
  // The config object contains selectors, filters, etc.
}, {
  selectors: ['a.result-link', 'div.result a'],
  maxResults: 3,
  excludedHostnames: ['example.com'],
});
```

## Creating a New Scraper

To create a new scraper (e.g., PealimScraper):

1. **Implement `parameterToUrl`**: Transform your parameter into a search URL
2. **Use `loadPageWithPuppeteer`**: Load the page
3. **Define extraction config**: Specify selectors and filters for your site
4. **Extract data**: Use `page.evaluate()` with your extraction logic

Example:

```typescript
async scrapeResults(url: string): Promise<string[]> {
  const { browser, page } = await loadPageWithPuppeteer(url);
  
  const results = await page.evaluate((config) => {
    // Your site-specific extraction logic
    const links = document.querySelectorAll(config.selector);
    return Array.from(links).map(link => link.href);
  }, { selector: 'a.search-result' });
  
  await browser.close();
  return results;
}
```

## Future Improvements

- Create a serializable extraction function that can be passed to `page.evaluate()`
- Add more extraction utilities (text extraction, image extraction, etc.)
- Support for different page loaders (Playwright, etc.)

