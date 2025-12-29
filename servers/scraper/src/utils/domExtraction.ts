/**
 * Configuration for extracting URLs from a DOM tree
 */
export interface UrlExtractionConfig {
  /**
   * CSS selectors to try, in order of preference
   */
  selectors: string[];

  /**
   * Maximum number of URLs to extract
   */
  maxResults?: number;

  /**
   * Function to filter URLs (e.g., exclude certain domains)
   */
  urlFilter?: (url: string) => boolean;

  /**
   * Function to transform/clean URLs (e.g., decode Google redirects)
   */
  urlTransformer?: (url: string) => string | null;
}

/**
 * Configuration object that can be serialized and passed to page.evaluate()
 */
export interface SerializableExtractionConfig {
  selectors: string[];
  maxResults?: number;
  excludedHostnames?: string[];
}

/**
 * Result of URL extraction
 */
export interface UrlExtractionResult {
  urls: string[];
  debug?: string[];
}

/**
 * Extracts URLs from the DOM using the provided configuration.
 * This function is designed to run in the browser context via page.evaluate().
 */
export function extractUrlsFromDOM(
  config: UrlExtractionConfig
): UrlExtractionResult {
  const urls: string[] = [];
  const seen = new Set<string>();
  const debug: string[] = [];
  const maxResults = config.maxResults || 3;

  // Debug: check what's on the page
  debug.push(`Page title: ${document.title}`);
  debug.push(
    `Body text length: ${document.body?.textContent?.length || 0}`
  );

  // Try each selector in order
  for (const selector of config.selectors) {
    if (urls.length >= maxResults) break;

    const links = document.querySelectorAll<HTMLAnchorElement>(selector);
    debug.push(`Selector "${selector}" found ${links.length} elements`);

    for (const link of Array.from(links)) {
      if (urls.length >= maxResults) break;

      let href = link.href || link.getAttribute("href") || "";

      if (!href) continue;

      // Transform URL if transformer is provided
      if (config.urlTransformer) {
        const transformed = config.urlTransformer(href);
        if (transformed) {
          href = transformed;
        } else {
          continue; // Transformer returned null, skip this URL
        }
      }

      // Validate URL
      if (!href.startsWith("http://") && !href.startsWith("https://")) {
        continue;
      }

      // Filter URL if filter is provided
      if (config.urlFilter && !config.urlFilter(href)) {
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
}

/**
 * Creates a URL filter that excludes certain hostnames
 */
export function createHostnameFilter(excludedHostnames: string[]): (url: string) => boolean {
  return (url: string) => {
    try {
      const urlObj = new URL(url);
      return !excludedHostnames.some((excluded) =>
        urlObj.hostname.includes(excluded)
      );
    } catch {
      return false;
    }
  };
}

/**
 * Creates a URL transformer for Google redirect format (/url?q=...)
 */
export function createGoogleRedirectTransformer(): (url: string) => string | null {
  return (href: string) => {
    // Handle Google's redirect format: /url?q=...
    if (href.includes("/url?q=")) {
      const match = href.match(/url\?q=([^&]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    // Handle direct URLs
    else if (href.startsWith("http://") || href.startsWith("https://")) {
      return href;
    }
    // Handle relative URLs that might be Google redirects
    else if (href.startsWith("/url")) {
      const match = href.match(/\/url\?q=([^&]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    return null;
  };
}
