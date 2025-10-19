import { chromium } from "playwright";
import { Product } from "./types";

/**
 * Scrapes all Pokémon card listings from bol.com, including pagination and price detection logic.
 */
export async function scrapePokemonProducts(): Promise<Product[]> {
  const startUrl = "https://www.bol.com/nl/nl/s/?searchtext=pokemon+kaarten";
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const allProducts: Product[] = [];

  try {
    console.log("🕷️ Scraper started...");

    // Opens the main search page and accepts cookies if needed.
    await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.click('button:has-text("Alles accepteren")').catch(() => {});
    await page.waitForTimeout(1500);

    // Detects how many pages of results exist.
    const totalPages = await page.evaluate(() => {
      const pagination = document.querySelector('[data-testid="pagination"]');
      if (!pagination) return 1;
      const pages = Array.from(pagination.querySelectorAll("a"))
        .map((a) => parseInt(a.textContent || ""))
        .filter((n) => !isNaN(n));
      return pages.length ? Math.max(...pages) : 1;
    });

    console.log(`📑 Total pages: ${totalPages}`);

    // Loops through all pages and collects Pokémon product data.
    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
      const url = `${startUrl}&page=${currentPage}`;
      console.log(`📄 Page ${currentPage}/${totalPages}: ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1500);

      // Extracts product information (title, link, and price) from the current page.
      const productsOnPage: Product[] = await page.evaluate(() => {
        const items: Product[] = [];
        const containers = document.querySelectorAll('[data-bltgi*="ProductList_Middle"]');

        containers.forEach((container) => {
          const title = container.querySelector("h2")?.textContent?.trim() || "";
          const linkEl = container.querySelector('a[href*="/p/"]') as HTMLAnchorElement;
          if (!title || !linkEl) return;

          // Determines the product price using multiple fallbacks.
          let price = "Price unknown";

          // Extracts price from hidden accessibility span (most reliable source).
          const hiddenSpan = container.querySelector('span[style*="position:absolute"]');
          if (hiddenSpan?.textContent?.includes("euro")) {
            const match = hiddenSpan.textContent.match(/'(\d+)' euro en '(\d+)' cent/);
            if (match) price = `€ ${match[1]},${match[2]}`;
          }

          // Falls back to visible price elements if the hidden span is missing.
          if (price === "Price unknown") {
            const visible = container.querySelector(".font-produkt");
            if (visible) {
              const parts = Array.from(visible.querySelectorAll("span[aria-hidden='true']"))
                .map((s) => s.textContent?.trim() || "")
                .filter((t) => /\d+|,/.test(t));
              if (parts.length >= 2) price = `€ ${parts.join("")}`;
            }
          }

          // Uses regex as a final fallback to detect numeric price patterns.
          if (price === "Price unknown") {
            const text = container.textContent || "";
            const match = text.match(/(\d{1,3})[,.](\d{2})/);
            if (match) price = `€ ${match[1]},${match[2]}`;
          }

          items.push({
            title,
            price,
            link: "https://www.bol.com" + linkEl.pathname,
          });
        });

        return items;
      });

      console.log(`✅ ${productsOnPage.length} products on page ${currentPage}`);
      allProducts.push(...productsOnPage);
    }

    // Filters out accessories like binders and sleeves, keeping only real Pokémon cards.
    const filtered = allProducts.filter((product) => {
      const titleLower = product.title.toLowerCase();
      const hasPokemon = titleLower.includes("pokemon") || titleLower.includes("pokémon");
      const isAccessory =
        titleLower.includes("verzamelmap") ||
        titleLower.includes("binder") ||
        titleLower.includes("map voor") ||
        titleLower.includes("sleeves") ||
        titleLower.includes("toploader") ||
        titleLower.includes("hoesjes");
      return hasPokemon && !isAccessory;
    });

    console.log(`🎯 Total ${filtered.length} genuine Pokémon products found.`);
    return filtered;
  } catch (error) {
    console.error("❌ Error while scraping:", error);
    return [];
  } finally {
    // Always closes the browser instance even if an error occurs.
    await browser.close();
  }
}
