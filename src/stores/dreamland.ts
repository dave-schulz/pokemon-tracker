import { chromium } from "playwright";

export interface Product {
  title: string;
  price: string;
  link: string;
  inStock: boolean;
  store: string;
}

/**
 * Scrapes all Pokémon card products from Dreamland across all pages,
 * filters out accessories (binders, sleeves, etc.), and returns clean product data.
 */
export async function scrapeDreamland(keyword: string = "pokemon ruilkaarten"): Promise<Product[]> {
  const baseUrl = "https://www.dreamland.nl/zoeken/producten?q=";
  const query = encodeURIComponent(keyword);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const allProducts: Product[] = [];

  console.log(`🕷️ Dreamland-scraper gestart voor zoekterm "${keyword}"...`);

  try {
    let pageNum = 1;

    while (true) {
      const url = `${baseUrl}${query}&page=${pageNum}`;
      console.log(`📄 Dreamland pagina ${pageNum} laden: ${url}`);

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

      const hasProducts = await page.$("article.product-card");
      if (!hasProducts) {
        console.log("⚠️ Geen producten meer gevonden — stoppen met scrapen.");
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
          const inStock = !!article.querySelector(".product-card__stock-status");

          if (title && link) items.push({ title, price, link, inStock });
        });

        return items;
      });

      console.log(`✅ ${pageProducts.length} producten gevonden op pagina ${pageNum}`);
      allProducts.push(...pageProducts.map((p) => ({ ...p, store: "Dreamland" })));

      // Controleer of er een volgende pagina is
      const nextExists = await page.$("a.pagination__next");
      if (!nextExists) {
        console.log("🚪 Geen volgende pagina — einde bereikt.");
        break;
      }

      pageNum++;
    }

    // 🧠 Slim filter: alleen echte Pokémon kaarten (geen accessoires)
    const filtered = allProducts.filter((product) => {
      const titleLower = product.title.toLowerCase();
      const hasPokemon = titleLower.includes("pokemon") || titleLower.includes("pokémon");
      const isAccessory =
        titleLower.includes("verzamelmap") ||
        titleLower.includes("binder") ||
        titleLower.includes("map voor") ||
        titleLower.includes("sleeves") ||
        titleLower.includes("toploader") ||
        titleLower.includes("hoesjes") ||
        titleLower.includes("portfolio") ||
        titleLower.includes("deckbox");
      return hasPokemon && !isAccessory;
    });

    console.log(
      `🎯 Gefilterd resultaat: ${filtered.length} van ${allProducts.length} producten behouden.`,
    );

    return filtered;
  } catch (error) {
    console.error("❌ Fout bij scrapen van Dreamland:", error);
    return [];
  } finally {
    await browser.close();
  }
}
