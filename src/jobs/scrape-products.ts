import { scrapeBol } from "../stores/bol";
import { scrapeDreamland } from "../stores/dreamland";
import { detectChanges } from "../monitor";
import { notifyNew, notifyPriceDrops } from "../notify";
import { saveProducts, loadProducts } from "../storage";
import type { Product } from "../types";

/**
 * Scrapes all stores for new Pokémon card products and detects changes.
 */
export async function scrapeAllStores(): Promise<void> {
  console.log("🕷️ Running product scraping job...");

  const stores = [
    { name: "Bol.com", fn: scrapeBol },
    { name: "Dreamland", fn: scrapeDreamland },
  ];

  for (const store of stores) {
    console.log(`🏪 Scraping ${store.name}...`);

    const oldProducts = await loadProducts(store.name);
    let newProducts: Product[] = [];

    try {
      newProducts = await store.fn();
    } catch (err) {
      console.error(`❌ Failed to scrape ${store.name}:`, (err as Error).message);
      continue;
    }

    if (!newProducts.length) {
      console.warn(`⚠️ No products found for ${store.name}.`);
      continue;
    }

    const { newProducts: newOnes, priceDrops } = detectChanges(oldProducts, newProducts);

    if (newOnes.length || priceDrops.length) {
      console.log(`📢 Changes found for ${store.name}:`);
      if (newOnes.length) console.log(`  🆕 ${newOnes.length} new`);
      if (priceDrops.length) console.log(`  💸 ${priceDrops.length} price drops`);

      await notifyNew(newOnes);
      await notifyPriceDrops(priceDrops);
    } else {
      console.log(`🟢 No product changes for ${store.name}.`);
    }

    await saveProducts(store.name, newProducts);
  }

  console.log("✅ Product scraping job complete.\n");
}
