import "dotenv/config";
import { chromium, BrowserContext } from "playwright";
import pLimit from "p-limit";
import { loadProducts, saveProducts } from "./storage";
import { detectChanges } from "./monitor";
import { notifyNew, notifyPriceDrops, notifyRestocks } from "./notify";
import { scrapeBol } from "./stores/bol";
import { scrapeDreamland } from "./stores/dreamland";
import { checkProductDetailStock } from "./utils/checkStock";
import { Product } from "./types";

/**
 * 🏪 Scrapes, detects changes, and sends notifications for a specific store.
 */
async function runStore(storeName: string, scrapeFn: () => Promise<Product[]>) {
  console.log(`🏪 Starting scrape for ${storeName}...`);

  let oldProducts: Product[] = [];
  let newProducts: Product[] = [];

  // 🧠 Load existing products
  try {
    oldProducts = await loadProducts(storeName);
  } catch (err) {
    console.warn(`⚠️ Could not load old products for ${storeName}:`, (err as Error).message);
  }

  // 🕷️ Run scraper
  try {
    newProducts = await scrapeFn();
  } catch (err) {
    console.error(`❌ Scrape failed for ${storeName}:`, (err as Error).message);
    return;
  }

  if (!newProducts.length) {
    console.warn(`⚠️ Skipping ${storeName} — no products scraped.`);
    return;
  }

  // 📊 Detect differences
  const { newProducts: newOnes, priceDrops, restocked } = detectChanges(oldProducts, newProducts);

  // 🔔 Notify if something changed
  if (newOnes.length || priceDrops.length || restocked.length) {
    console.log(`📢 Detected changes for ${storeName}:`);
    if (newOnes.length) console.log(`  🆕 ${newOnes.length} new`);
    if (priceDrops.length) console.log(`  💸 ${priceDrops.length} price drops`);
    if (restocked.length) console.log(`  📦 ${restocked.length} restocks`);

    try {
      if (newOnes.length) await notifyNew(newOnes);
      if (priceDrops.length) await notifyPriceDrops(priceDrops);
      if (restocked.length) await notifyRestocks(restocked);
    } catch (err) {
      console.error(`❌ Discord notification error for ${storeName}:`, (err as Error).message);
    }
  } else {
    console.log(`🟢 No changes for ${storeName}.`);
  }

  // 💾 Save new state
  try {
    await saveProducts(storeName, newProducts);
    console.log(`✅ ${storeName} updated successfully.\n`);
  } catch (err) {
    console.error(`❌ Failed to save products for ${storeName}:`, (err as Error).message);
  }
}

/**
 * 🧭 Shared browser context — reused across stock checks.
 */
let sharedContext: BrowserContext | null = null;

async function getBrowserContext() {
  if (!sharedContext) {
    console.log("🚀 Launching shared Playwright browser...");
    const browser = await chromium.launchPersistentContext("/tmp/playwright", {
      headless: true,
      timeout: 60000,
    });
    sharedContext = browser;
  }
  return sharedContext;
}

async function closeBrowserContext() {
  if (sharedContext) {
    console.log("🛑 Closing browser context...");
    await sharedContext.close();
    sharedContext = null;
  }
}

/**
 * 📦 Checks product stock across all stores.
 * Optimized: runs in parallel batches and uses persistent browser.
 */
async function runStockCheck() {
  console.log("📦 Running fast stock check...");

  const context = await getBrowserContext();
  const limit = pLimit(10); // Max concurrent checks
  const stores = ["Bol.com", "Dreamland"];
  const restockedTotal: Product[] = [];
  const currentMinute = new Date().getMinutes();

  for (const store of stores) {
    let products: Product[] = [];

    try {
      products = await loadProducts(store);
    } catch (err) {
      console.warn(`⚠️ Could not load products for ${store}:`, (err as Error).message);
      continue;
    }

    if (!products.length) {
      console.log(`⚠️ No products found for ${store}.`);
      continue;
    }

    const priority = products.filter((p) => (p as any).priority === true);
    const regular = products.filter((p) => !(p as any).priority);
    const productsToCheck = currentMinute % 10 === 0 ? [...priority, ...regular] : priority;

    console.log(
      `🔍 Checking ${productsToCheck.length} products (${priority.length} priority) from ${store}...`,
    );

    const restocked: Product[] = [];

    await Promise.allSettled(
      productsToCheck.map((p) =>
        limit(async () => {
          let page = null;
          try {
            // 🔎 Heuristic: if Bol.com listing already shows "uitverkocht", skip detail load
            if (store === "Bol.com" && p.title.toLowerCase().includes("uitverkocht")) {
              p.inStock = false;
              return;
            }

            page = await context.newPage();
            const inStock = await checkProductDetailStock(page, p.link);

            if (!p.inStock && inStock) {
              p.inStock = true;
              restocked.push(p);
            } else if (p.inStock && !inStock) {
              p.inStock = false;
            }
          } catch (err) {
            console.error(`⚠️ Stock check failed for ${p.title}:`, (err as Error).message);
          } finally {
            // ✅ Always close the page, even on error
            if (page) {
              try {
                await page.close();
              } catch (closeErr) {
                console.error(`⚠️ Failed to close page for ${p.title}`);
              }
            }
          }
        }),
      ),
    );

    try {
      await saveProducts(store, products);
    } catch (err) {
      console.error(`❌ Failed to save products for ${store}:`, (err as Error).message);
    }

    if (restocked.length) {
      console.log(`📦 ${restocked.length} restocked at ${store}!`);
      try {
        await notifyRestocks(restocked);
      } catch (err) {
        console.error(`❌ Failed to notify restocks for ${store}:`, (err as Error).message);
      }
      restockedTotal.push(...restocked);
    } else {
      console.log(`🟢 No restocks at ${store}.`);
    }
  }

  console.log(
    restockedTotal.length
      ? `🎯 ${restockedTotal.length} total restocks detected!`
      : "🟢 No restocks detected across stores.",
  );

  console.log("✅ Stock check complete.\n");
}

/**
 * 🕷️ Runs all store scrapers in parallel.
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
 * 🔒 Locks to prevent overlapping executions
 */
let isRunningFullScrape = false;
let isRunningStockCheck = false;

async function mainWithLock() {
  if (isRunningFullScrape) {
    console.log("⏩ Skipping full scrape - already running");
    return;
  }

  isRunningFullScrape = true;
  try {
    await main();
  } catch (err) {
    console.error("❌ Full scrape error:", (err as Error).message);
  } finally {
    isRunningFullScrape = false;
  }
}

async function stockCheckWithLock() {
  if (isRunningStockCheck) {
    console.log("⏩ Skipping stock check - already running");
    return;
  }

  isRunningStockCheck = true;
  try {
    await runStockCheck();
  } catch (err) {
    console.error("❌ Stock check error:", (err as Error).message);
  } finally {
    isRunningStockCheck = false;
  }
}

/**
 * 🛑 Graceful shutdown handler
 */
let isShuttingDown = false;

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("\n🛑 Shutting down gracefully...");

  // Wait for running tasks to complete (max 30 seconds)
  const startTime = Date.now();
  while ((isRunningFullScrape || isRunningStockCheck) && Date.now() - startTime < 30000) {
    console.log("⏳ Waiting for tasks to complete...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  await closeBrowserContext();
  console.log("✅ Shutdown complete");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

/**
 * 🕒 Schedule tasks:
 * - Full scrape every 6 hours
 * - Stock check every 30 seconds (priority products)
 */
console.log("🚀 Starting price monitor...");
console.log("📅 Full scrape: every 6 hours");
console.log("📦 Stock check: every 30 seconds\n");

mainWithLock();
setInterval(mainWithLock, 6 * 60 * 60 * 1000);
setInterval(stockCheckWithLock, 30 * 1000);
