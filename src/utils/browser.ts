import { chromium, Browser } from "playwright";

let sharedBrowser: Browser | null = null;

/**
 * Returns a shared Chromium browser instance.
 * This prevents reopening a new session for every store scrape.
 */
export async function getBrowser(): Promise<Browser> {
  if (sharedBrowser && sharedBrowser.isConnected()) {
    return sharedBrowser;
  }

  console.log("🚀 Launching shared Chromium instance...");
  sharedBrowser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  return sharedBrowser;
}

/**
 * Cleanly closes the shared browser instance (optional for shutdown).
 */
export async function closeBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close().catch(() => {});
    sharedBrowser = null;
  }
}
