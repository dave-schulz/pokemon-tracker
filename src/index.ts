import "dotenv/config";
import { loadProducts, saveProducts } from "./storage";
import { detectChanges } from "./monitor";
import { notifyNew, notifyPriceDrops, notifyRestocks } from "./notify";
import { scrapeBol } from "./stores/bol";
import { scrapeDreamland } from "./stores/dreamland";

/** Handles scraping, change detection, and notifications for a single store. */
async function runStore(storeName: string, scrapeFn: () => Promise<any[]>) {
  console.log(`🏪 Starting scrape for ${storeName}...`);

  const oldProducts = loadProducts(storeName);
  let newProducts: any[] = [];

  try {
    newProducts = await scrapeFn();
  } catch (err) {
    console.error(`❌ Scrape failed for ${storeName}:`, (err as Error).message);
  }

  if (!newProducts || newProducts.length === 0) {
    console.warn(`⚠️ Skipping ${storeName} — no products scraped.`);
    return;
  }

  const { newProducts: newOnes, priceDrops, restocked } = detectChanges(oldProducts, newProducts);

  if (newOnes.length || priceDrops.length || restocked.length) {
    console.log(`📢 Changes detected for ${storeName}:`);
    if (newOnes.length) console.log(`  🆕 ${newOnes.length} new products`);
    if (priceDrops.length) console.log(`  💸 ${priceDrops.length} price drops`);
    if (restocked.length) console.log(`  📦 ${restocked.length} restocks`);
  } else {
    console.log(`🟢 No changes for ${storeName}.`);
  }

  await notifyNew(newOnes);
  await notifyPriceDrops(priceDrops);
  await notifyRestocks(restocked);

  saveProducts(storeName, newProducts);

  console.log(`✅ Finished processing ${storeName}.\n`);
}

/** Main process that scrapes products from all supported stores. */
async function main() {
  console.log("🕷️ Starting full scrape cycle...");

  await Promise.allSettled([runStore("bol", scrapeBol), runStore("dreamland", scrapeDreamland)]);

  console.log("✅ All stores processed.\n");
}

/** Run the scraper continuously every 2 minutes. */
setInterval(main, 120_000);
main();
