import { Product } from "../types";
import { getBrowser } from "../utils/browser";
import { safePageLoad } from "../utils/safePageLoad";
import { filterPokemonProducts } from "../utils/filterProducts";
import { checkProductDetailStock } from "../utils/checkStock";

/**
 * Scrapes all Pokémon card products from Dreamland using shared browser, safe page loading,
 * and detail-level stock verification for uncertain items.
 */
export async function scrapeDreamland(keyword: string = "pokemon ruilkaarten"): Promise<Product[]> {
  const baseUrl = "https://www.dreamland.nl/zoeken/producten?q=";
  const query = encodeURIComponent(keyword);
  const browser = await getBrowser();
  const page = await browser.newPage();
  const detailPage = await browser.newPage();
  const allProducts: Product[] = [];

  console.log(`🕷️ Dreamland scraper started for search "${keyword}"...`);

  try {
    let pageNum = 1;

    while (true) {
      const url = `${baseUrl}${query}&page=${pageNum}`;
      const ok = await safePageLoad(page, url, pageNum);
      if (!ok) break;

      const hasProducts = await page.$("article.product-card");
      if (!hasProducts) {
        console.log("⚠️ No products found — stopping Dreamland scraper.");
        break;
      }

      // Extract all visible product info
      const pageProducts = await page.evaluate(() => {
        const items: {
          title: string;
          price: string;
          link: string;
          inStock: boolean;
        }[] = [];

        document.querySelectorAll("article.product-card").forEach((article) => {
          const title = article.querySelector("h2 a")?.textContent?.trim() ?? "Onbekend";
          const link = (article.querySelector("h2 a") as HTMLAnchorElement)?.href ?? "";
          const price =
            article
              .querySelector(".product-pricing__price")
              ?.textContent?.replace(/\s+/g, " ")
              .trim() ?? "Onbekend";
          const inStock = !article.textContent?.toLowerCase().includes("uitverkocht");

          if (title && link) items.push({ title, price, link, inStock });
        });

        return items;
      });

      // 🔍 Verify stock on detail page if uncertain or price unknown
      for (const p of pageProducts) {
        if (!p.inStock || p.price === "Onbekend") {
          const verified = await checkProductDetailStock(detailPage, p.link);
          if (verified !== p.inStock) {
            console.log(`🔁 Stock corrected for ${p.title}: ${p.inStock} → ${verified}`);
            p.inStock = verified;
          }
          await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
        }
      }

      console.log(`✅ Processed ${pageProducts.length} products on Dreamland page ${pageNum}`);
      allProducts.push(...pageProducts.map((p) => ({ ...p, store: "Dreamland" })));

      // Check if there’s a next page
      const nextExists = await page.$("a.pagination__next");
      if (!nextExists) {
        console.log("🚪 No next page — reached end of Dreamland results.");
        break;
      }

      pageNum++;
    }

    const filtered = filterPokemonProducts(allProducts);
    console.log(`🎯 Filtered ${filtered.length} of ${allProducts.length} Dreamland products.`);
    return filtered;
  } catch (error) {
    console.error("❌ Error scraping Dreamland:", error);
    return [];
  } finally {
    await page.close();
    await detailPage.close();
  }
}
