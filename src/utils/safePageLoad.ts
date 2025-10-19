import { Page } from "playwright";

// Keeps track of which domains have already had their cookies accepted
const acceptedCookies = new Set<string>();

/**
 * Safely loads a page URL with retries, automatic cookie acceptance (only once per domain),
 * domain-specific selectors, and random delays to reduce bot detection.
 */
export async function safePageLoad(page: Page, url: string, pageNum?: number): Promise<boolean> {
  const maxRetries = 3;
  const domain = new URL(url).hostname;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🕸️ Loading page ${pageNum ?? "?"} (attempt ${attempt}): ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

      // ✅ Handle cookie popup only once per domain
      if (!acceptedCookies.has(domain)) {
        const cookieSelectors = [
          // General
          'button:has-text("Accepteren")',
          'button:has-text("Alles accepteren")',
          'button:has-text("Alle cookies toestaan")',
          'button:has-text("Akkoord")',
          'button:has-text("OK")',
          'button:has-text("Accept all")',
          'button:has-text("Accept cookies")',
          'button:has-text("I agree")',
          'button:has-text("Got it")',

          // Domain-specific known selectors
          "#accept-cookies",
          ".cookiebar-accept",
          "#cookie-consent-accept",
          '[data-testid="accept-all-cookies-button"]',
        ];

        for (const selector of cookieSelectors) {
          const cookieBtn = await page.$(selector);
          if (cookieBtn) {
            await cookieBtn.click().catch(() => {});
            console.log(`🍪 Cookie popup closed for ${domain}`);
            acceptedCookies.add(domain);
            await page.waitForTimeout(1000);
            break;
          }
        }
      }

      // 💤 Random wait to simulate human browsing and reduce detection
      await page.waitForTimeout(1000 + Math.random() * 3000);

      return true;
    } catch (err) {
      console.warn(
        `⚠️ Error loading page ${pageNum ?? "?"} (attempt ${attempt}): ${(err as Error).message}`,
      );

      if (attempt < maxRetries) {
        console.log("🔁 Retrying...");
        await page.waitForTimeout(3000 + Math.random() * 2000);
      } else {
        console.error(
          `❌ Giving up on page ${pageNum ?? "?"} after ${maxRetries} failed attempts.`,
        );
      }
    }
  }

  return false;
}
