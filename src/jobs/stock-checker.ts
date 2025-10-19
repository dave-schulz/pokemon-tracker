import { PrismaClient, Product as DbProduct } from "@prisma/client";
import { chromium } from "playwright";
import { checkProductDetailStock } from "../utils/checkStock";
import { notifyRestocks } from "../notify";

const db = new PrismaClient();

/**
 * 📦 Ultra-fast stock checker
 * - Controleert prioriteitsproducten elke minuut
 * - Controleert alle andere producten om de 10 minuten
 */
export async function runStockCheck(): Promise<void> {
  console.log("📦 Running advanced stock check...");

  const now = new Date();
  const minute = now.getMinutes();

  // 🔹 1x per minuut checken we priority-producten
  const priorityProducts = await db.product.findMany({
    where: { priority: true },
  });

  // 🔹 Elke 10 minuten checken we ook gewone producten
  const normalProducts =
    minute % 10 === 0 ? await db.product.findMany({ where: { priority: false } }) : [];

  const productsToCheck = [...priorityProducts, ...normalProducts];
  if (!productsToCheck.length) {
    console.log("⚠️ No products to check at this time.");
    return;
  }

  console.log(
    `🔍 Checking ${productsToCheck.length} products (${priorityProducts.length} priority)...`,
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const restocked: DbProduct[] = [];

  // Batch size = 5 parallel checks
  const batchSize = 5;
  for (let i = 0; i < productsToCheck.length; i += batchSize) {
    const batch = productsToCheck.slice(i, i + batchSize);

    await Promise.allSettled(
      batch.map(async (product) => {
        const page = await context.newPage();

        try {
          const inStock = await checkProductDetailStock(page, product.link);

          if (inStock && !product.inStock) {
            restocked.push(product);
            await db.product.update({
              where: { id: product.id },
              data: { inStock: true, lastSeen: new Date() },
            });
          } else if (!inStock && product.inStock) {
            await db.product.update({
              where: { id: product.id },
              data: { inStock: false, lastSeen: new Date() },
            });
          }
        } catch (err) {
          console.error(`⚠️ Error checking stock for ${product.title}:`, (err as Error).message);
        } finally {
          await page.close();
        }
      }),
    );
  }

  await browser.close();

  if (restocked.length) {
    console.log(`📢 ${restocked.length} restocked products detected!`);
    await notifyRestocks(restocked);
  } else {
    console.log("🟢 No restocks this run.");
  }

  console.log("✅ Stock check complete.\n");
}
