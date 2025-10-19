import "dotenv/config";
import { loadProducts, saveProducts } from "./storage";
import { detectChanges } from "./monitor";
import { notifyNew, notifyPriceDrops, notifyRestocks } from "./notify";
import { scrapeBol } from "./stores/bol";
import { scrapeDreamland } from "./stores/dreamland";
import { Product } from "./types";

/**
 * 🏪 Runs the full scrape and change detection for a single store.
 * Uses Prisma-backed storage instead of JSON files.
 */
async function runStore(storeName: string, scrapeFn: () => Promise<Product[]>) {
  console.log(`🏪 Starting scrape for ${storeName}...`);

  let oldProducts: Product[] = [];
  let newProducts: Product[] = [];

  // 🔹 Load existing products from the database
  try {
    oldProducts = await loadProducts(storeName);
  } catch (err) {
    console.warn(`⚠️ Could not load old products for ${storeName}:`, (err as Error).message);
  }

  // 🔹 Scrape fresh product data
  try {
    newProducts = await scrapeFn();
  } catch (err) {
    console.error(`❌ Scrape failed for ${storeName}:`, (err as Error).message);
    return; // Stop if scraping failed
  }

  if (!newProducts || newProducts.length === 0) {
    console.warn(`⚠️ Skipping ${storeName} — no products scraped.`);
    return;
  }

  // 🔹 Compare current vs previous data
  const { newProducts: newOnes, priceDrops, restocked } = detectChanges(oldProducts, newProducts);

  // 🔹 Log changes clearly
  if (newOnes.length || priceDrops.length || restocked.length) {
    console.log(`📢 Changes detected for ${storeName}:`);
    if (newOnes.length) console.log(`  🆕 ${newOnes.length} new products`);
    if (priceDrops.length) console.log(`  💸 ${priceDrops.length} price drops`);
    if (restocked.length) console.log(`  📦 ${restocked.length} restocks`);
  } else {
    console.log(`🟢 No changes for ${storeName}.`);
  }

  // 🔹 Send Discord notifications for each change type
  try {
    if (newOnes.length) await notifyNew(newOnes);
    if (priceDrops.length) await notifyPriceDrops(priceDrops);
    if (restocked.length) await notifyRestocks(restocked);
  } catch (err) {
    console.error(
      `❌ Failed to send Discord notifications for ${storeName}:`,
      (err as Error).message,
    );
  }

  // 🔹 Save updated products to the database
  try {
    await saveProducts(storeName, newProducts);
    console.log(`✅ Finished processing ${storeName}.\n`);
  } catch (err) {
    console.error(`❌ Failed to save products for ${storeName}:`, (err as Error).message);
  }
}

/**
 * 🕷️ Runs all scrapers in parallel (Bol.com, Dreamland, etc.)
 * Each store runs independently to prevent blocking.
 */
async function main() {
  console.log("🕷️ Starting full scrape cycle...");

  await Promise.allSettled([
    runStore("Bol.com", scrapeBol),
    runStore("Dreamland", scrapeDreamland),
  ]);

  console.log("✅ All stores processed.\n");
}

/**
 * ⏱️ Run scraper continuously every 2 minutes (120s).
 */
setInterval(main, 120_000);
main();
