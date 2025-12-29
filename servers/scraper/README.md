# Scraper

A configurable web scraper that iterates through a list of parameters, generates URLs, scrapes results, and saves them to a YAML file.

## Current Configuration

- **Base URL**: Google.com (for testing)
- **Parameters**: List of fruits (apple, banana, orange, grape, strawberry)
- **Scraping**: Extracts first 3 search result URLs from Google
- **Output**: YAML file with parameter as key and array of URLs as value

## Usage

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Run the scraper:
   ```bash
   pnpm start
   ```

## Configuration

The scraper is designed to be easily configurable:

- **Base URL**: Change `BASE_URL` constant
- **Parameters**: Modify `PARAMETERS` array
- **URL Generation**: Update `parameterToUrl()` function
- **Scraping Logic**: Modify `scrapeResults()` function
- **Result Formatting**: Adjust how results are stored in YAML

## Note

Google search results may require JavaScript rendering or may block simple HTTP requests. The current implementation uses basic HTTP requests with cheerio for parsing. For production use with Google or other JavaScript-heavy sites, you may need to use a headless browser like Puppeteer or Playwright.

## Output Format

Results are saved to `results.yaml` in the following format:

```yaml
apple:
  - https://example.com/apple
  - https://example.com/apple-info
  - https://example.com/apple-recipes
banana:
  - https://example.com/banana
  - ...
```

