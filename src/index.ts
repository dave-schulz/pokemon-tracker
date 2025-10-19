import "dotenv/config";
import { loadProducts, saveProducts } from "./storage";
import { detectChanges } from "./monitor";
import { notifyNew, notifyPriceDrops, notifyRestocks } from "./notify";
import { scrapeBol } from "./stores/bol";
import { scrapeDreamland } from "./stores/dreamland";
import { Product } from "./types";

/**
 * Handles scraping, change detection, and notifications for a single store.
 * Each store has its own JSON file to prevent cross-store duplication.
 */
async function runStore(storeName: string, scrapeFn: () => Promise<Product[]>) {
  console.log(`🏪 Starting scrape for ${storeName}...`);

  // Load the previous snapshot of products for this store
  const oldProducts = loadProducts(storeName);
  let newProducts: Product[] = [];

  try {
    newProducts = await scrapeFn();
  } catch (err) {
    console.error(`❌ Scrape failed for ${storeName}:`, (err as Error).message);
  }

  if (!newProducts || newProducts.length === 0) {
    console.warn(`⚠️ Skipping ${storeName} — no products scraped.`);
    return;
  }

  // Detect changes between the previous and current product lists
  const { newProducts: newOnes, priceDrops, restocked } = detectChanges(oldProducts, newProducts);

  // Log detected changes
  if (newOnes.length || priceDrops.length || restocked.length) {
    console.log(`📢 Changes detected for ${storeName}:`);
    if (newOnes.length) console.log(`  🆕 ${newOnes.length} new products`);
    if (priceDrops.length) console.log(`  💸 ${priceDrops.length} price drops`);
    if (restocked.length) console.log(`  📦 ${restocked.length} restocks`);
  } else {
    console.log(`🟢 No changes for ${storeName}.`);
  }

  // Send Discord notifications per change type
  await notifyNew(newOnes);
  await notifyPriceDrops(priceDrops);
  await notifyRestocks(restocked);

  // Save the latest snapshot for this store
  saveProducts(storeName, newProducts);

  console.log(`✅ Finished processing ${storeName}.\n`);
}

/**
 * Main process that scrapes all supported stores in parallel.
 * Each store runs independently to prevent blocking the others.
 */
async function main() {
  console.log("🕷️ Starting full scrape cycle...");

  await Promise.allSettled([runStore("bol", scrapeBol), runStore("dreamland", scrapeDreamland)]);

  console.log("✅ All stores processed.\n");
}

/** Runs the scraper continuously every 2 minutes. */
setInterval(main, 120_000);
main();
