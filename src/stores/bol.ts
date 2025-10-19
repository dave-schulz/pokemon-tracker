import { Product } from "../types";
import { getBrowser } from "../utils/browser";
import { safePageLoad } from "../utils/safePageLoad";
import { filterPokemonProducts } from "../utils/filterProducts";
import { checkProductDetailStock } from "../utils/checkStock";

/**
 * Scrapes all Pokémon card products from Bol.com using safe page loading,
 * shared browser instance, and detail-level stock verification where needed.
 */
export async function scrapeBol(): Promise<Product[]> {
  const startUrl = "https://www.bol.com/nl/nl/s/?searchtext=pokemon+kaarten";
  const browser = await getBrowser();
  const page = await browser.newPage();
  const detailPage = await browser.newPage();
  const allProducts: Product[] = [];

  try {
    console.log("🕷️ Bol.com scraper started...");

    const ok = await safePageLoad(page, startUrl, 1);
    if (!ok) throw new Error("Failed to load the first page of Bol.com");

    // Detect total number of pages
    const totalPages = await page.evaluate(() => {
      const pagination = document.querySelector('[data-testid="pagination"]');
      if (!pagination) return 1;
      const pages = Array.from(pagination.querySelectorAll("a"))
        .map((a) => parseInt(a.textContent || ""))
        .filter((n) => !isNaN(n));
      return pages.length ? Math.max(...pages) : 1;
    });

    console.log(`📑 Found ${totalPages} pages on Bol.com.`);

    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
      const url = `${startUrl}&page=${currentPage}`;
      const ok = await safePageLoad(page, url, currentPage);
      if (!ok) continue;

      const productsOnPage: Product[] = await page.evaluate(() => {
        const items: Product[] = [];
        const containers = document.querySelectorAll('[data-bltgi*="ProductList_Middle"]');

        containers.forEach((container) => {
          const title = container.querySelector("h2")?.textContent?.trim() || "";
          const linkEl = container.querySelector('a[href*="/p/"]') as HTMLAnchorElement;
          if (!title || !linkEl) return;

          // --- Price detection ---
          let price = "Prijs onbekend";

          // 1️⃣ Invisible reader text
          const hiddenSpan = container.querySelector('span[style*="position:absolute"]');
          if (hiddenSpan?.textContent?.includes("euro")) {
            const match = hiddenSpan.textContent.match(/'(\d+)' euro en '(\d+)' cent/);
            if (match) price = `€ ${match[1]},${match[2]}`;
          }

          // 2️⃣ Visible fallback
          if (price === "Prijs onbekend") {
            const visible = container.querySelector(".font-produkt");
            if (visible) {
              const parts = Array.from(visible.querySelectorAll("span[aria-hidden='true']"))
                .map((s) => s.textContent?.trim() || "")
                .filter((t) => /\d+|,/.test(t));
              if (parts.length >= 2) price = `€ ${parts.join("")}`;
            }
          }

          // 3️⃣ Regex fallback
          if (price === "Prijs onbekend") {
            const text = container.textContent || "";
            const match = text.match(/(\d{1,3})[,.](\d{2})/);
            if (match) price = `€ ${match[1]},${match[2]}`;
          }

          const inStock = !container.textContent?.toLowerCase().includes("uitverkocht");

          items.push({
            title,
            price,
            link: "https://www.bol.com" + linkEl.pathname,
            inStock,
            store: "Bol.com",
          });
        });

        return items;
      });

      // 🔍 Verify stock on detail page if unclear or uncertain
      for (const p of productsOnPage) {
        if (!p.inStock || p.price === "Prijs onbekend") {
          const verified = await checkProductDetailStock(detailPage, p.link);
          if (verified !== p.inStock) {
            console.log(`🔁 Stock corrected for ${p.title}: ${p.inStock} → ${verified}`);
            p.inStock = verified;
          }
          // Small delay to avoid detection
          await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
        }
      }

      console.log(`✅ ${productsOnPage.length} products processed on page ${currentPage}`);
      allProducts.push(...productsOnPage);
    }

    const filtered = filterPokemonProducts(allProducts);
    console.log(`🎯 Found ${filtered.length} verified Pokémon products on Bol.com.`);
    return filtered;
  } catch (error) {
    console.error("❌ Fatal error scraping Bol.com:", error);
    return [];
  } finally {
    await page.close();
    await detailPage.close();
  }
}
