import { chromium } from "playwright";

export interface Product {
  title: string;
  price: string;
  link: string;
}

/**
 * Scrapes all Pokémon card products from bol.com, including pagination and price parsing.
 */
export async function scrapeBol(): Promise<Product[]> {
  const startUrl = "https://www.bol.com/nl/nl/s/?searchtext=pokemon+kaarten";
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const allProducts: Product[] = [];

  try {
    console.log("🕷️ Bol.com scraper started...");

    await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.click('button:has-text("Alles accepteren")').catch(() => {});
    await page.waitForTimeout(1500);

    // Detect total number of pages
    const totalPages = await page.evaluate(() => {
      const pagination = document.querySelector('[data-testid="pagination"]');
      if (!pagination) return 1;
      const pages = Array.from(pagination.querySelectorAll("a"))
        .map((a) => parseInt(a.textContent || ""))
        .filter((n) => !isNaN(n));
      return pages.length ? Math.max(...pages) : 1;
    });

    console.log(`📑 Found ${totalPages} pages on Bol.com`);

    // Loop through all pages
    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
      const url = `${startUrl}&page=${currentPage}`;
      console.log(`📄 Page ${currentPage}/${totalPages}: ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1500);

      const productsOnPage: Product[] = await page.evaluate(() => {
        const items: Product[] = [];
        const containers = document.querySelectorAll('[data-bltgi*="ProductList_Middle"]');

        containers.forEach((container) => {
          const title = container.querySelector("h2")?.textContent?.trim() || "";
          const linkEl = container.querySelector('a[href*="/p/"]') as HTMLAnchorElement;
          if (!title || !linkEl) return;

          // --- Price detection ---
          let price = "Prijs onbekend";

          // 1️⃣ Invisible text
          const hiddenSpan = container.querySelector('span[style*="position:absolute"]');
          if (hiddenSpan?.textContent?.includes("euro")) {
            const match = hiddenSpan.textContent.match(/'(\d+)' euro en '(\d+)' cent/);
            if (match) price = `€ ${match[1]},${match[2]}`;
          }

          // 2️⃣ Visible euro + cent fallback
          if (price === "Prijs onbekend") {
            const visible = container.querySelector(".font-produkt");
            if (visible) {
              const parts = Array.from(visible.querySelectorAll("span[aria-hidden='true']"))
                .map((s) => s.textContent?.trim() || "")
                .filter((t) => /\d+|,/.test(t));
              if (parts.length >= 2) price = `€ ${parts.join("")}`;
            }
          }

          // 3️⃣ Last fallback (regex)
          if (price === "Prijs onbekend") {
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

      console.log(`✅ ${productsOnPage.length} products found on page ${currentPage}`);
      allProducts.push(...productsOnPage);
    }

    // Filter only real Pokémon cards (exclude sleeves, binders, etc.)
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

    console.log(`🎯 Found ${filtered.length} real Pokémon card products on Bol.com.`);
    return filtered;
  } catch (error) {
    console.error("❌ Error scraping Bol.com:", error);
    return [];
  } finally {
    await browser.close();
  }
}
