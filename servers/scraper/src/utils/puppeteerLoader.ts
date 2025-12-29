import puppeteer from "puppeteer";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Options for loading a page with Puppeteer
 */
export interface PuppeteerLoadOptions {
  waitForSelector?: string;
  waitTimeout?: number;
  pageWaitTimeout?: number;
  userAgent?: string;
  takeScreenshot?: boolean;
  screenshotPath?: string;
}

/**
 * Loads a page with Puppeteer and returns the page instance.
 * The caller is responsible for closing the browser.
 */
export async function loadPageWithPuppeteer(
  url: string,
  options: PuppeteerLoadOptions = {}
): Promise<{ browser: puppeteer.Browser; page: puppeteer.Page }> {
  const {
    waitForSelector,
    waitTimeout = 10000,
    pageWaitTimeout = 30000,
    userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    takeScreenshot = false,
    screenshotPath,
  } = options;

  console.log(`Fetching: ${url}`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Set a realistic user agent
  await page.setUserAgent(userAgent);

  await page.goto(url, { waitUntil: "networkidle2", timeout: pageWaitTimeout });

  // Wait for specific selector if provided
  if (waitForSelector) {
    try {
      await page.waitForSelector(waitForSelector, { timeout: waitTimeout });
    } catch {
      // If selector doesn't appear, continue anyway
    }
  }

  // Wait a bit more for results to render
  await page.waitForTimeout(3000);

  // Take a screenshot for debugging if needed
  if (takeScreenshot || process.env.DEBUG) {
    const screenshot = screenshotPath || path.join(__dirname, "../../debug.png");
    await page.screenshot({ path: screenshot, fullPage: true });
    console.log(`  Debug: Saved screenshot to ${screenshot}`);
  }

  return { browser, page };
}

