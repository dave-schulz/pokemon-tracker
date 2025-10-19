import { chromium } from "playwright";

export interface Product {
  title: string;
  price: string;
  link: string;
}

export async function scrapePokemonProducts(): Promise<Product[]> {
  const url = "https://www.bol.com/nl/nl/s/?searchtext=pokemon+kaarten";

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector('[data-bltgi*="ProductList_Middle"]', { timeout: 10000 });

    await page.click('button:has-text("Alles accepteren")').catch(() => {});
    await page.waitForTimeout(2000);

    const allProducts = await page.evaluate(() => {
      const items: { title: string; price: string; link: string }[] = [];
      const containers = document.querySelectorAll('[data-bltgi*="ProductList_Middle"]');

      containers.forEach((container) => {
        const title = container.querySelector("h2")?.textContent?.trim() || "";
        const linkEl = container.querySelector('a[href*="/p/"]') as HTMLAnchorElement;
        if (!title || !linkEl) return;

        const allSpans = container.querySelectorAll('span[style*="position:absolute"]');
        let price = "Prijs onbekend";

        for (const span of allSpans) {
          const text = span.textContent || "";
          if (text.includes("euro") && text.includes("cent")) {
            const match = text.match(/['"]?(\d+)['"]?\s*euro\s*en\s*['"]?(\d+)['"]?\s*cent/);
            if (match) {
              price = `€ ${match[1]},${match[2]}`;
              break;
            }
          }
        }

        items.push({
          title,
          price,
          link: "https://www.bol.com" + linkEl.pathname,
        });
      });

      return items;
    });

    // Filter alleen echte Pokémon kaarten
    const products = allProducts.filter((product) => {
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

    return products;
  } catch (error) {
    console.error("Fout bij scrapen:", error);
    return [];
  } finally {
    await browser.close();
  }
}
