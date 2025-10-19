import { Product } from "../types";
import { getBrowser } from "../utils/browser";
import { safePageLoad } from "../utils/safePageLoad";
import { filterPokemonProducts } from "../utils/filterProducts";

/**
 * Scrapes all Pokémon card products from Dreamland using shared browser and safe page loading.
 */
export async function scrapeDreamland(keyword: string = "pokemon ruilkaarten"): Promise<Product[]> {
  const baseUrl = "https://www.dreamland.nl/zoeken/producten?q=";
  const query = encodeURIComponent(keyword);
  const browser = await getBrowser();
  const page = await browser.newPage();
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

      console.log(`✅ Found ${pageProducts.length} products on Dreamland page ${pageNum}`);
      allProducts.push(...pageProducts.map((p) => ({ ...p, store: "Dreamland" })));

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
  }
}
