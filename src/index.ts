import "dotenv/config";
import { scrapePokemonProducts } from "./scraper";
import { loadProducts, saveProducts } from "./storage";
import { detectChanges } from "./monitor";
import { notifyNew, notifyPriceDrops, notifyRestocks } from "./notify";

/** Main process that scrapes products, detects changes, and sends Discord notifications. */
async function main() {
  const oldProducts = loadProducts();
  const newProducts = await scrapePokemonProducts();

  // Compares old and new data to find new listings, price drops, and restocks.
  const { newProducts: newOnes, priceDrops, restocked } = detectChanges(oldProducts, newProducts);

  // Sends updates to Discord channels for each type of change.
  await notifyNew(newOnes);
  await notifyPriceDrops(priceDrops);
  await notifyRestocks(restocked);

  // Saves the latest product snapshot locally for comparison in the next run.
  saveProducts(newProducts);
}

/** Runs the scraper continuously every 2 minutes. */
setInterval(main, 120_000);
main();
