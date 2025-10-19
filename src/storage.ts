import fs from "fs";
import path from "path";

/** Represents a product stored locally between scraper runs. */
export interface StoredProduct {
  title: string;
  price: string;
  link: string;
  inStock?: boolean;
  store: string;
}

/** Directory where product snapshots are stored. */
const DATA_DIR = "data";
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

/**
 * Loads previously saved products for a specific store.
 * Returns an empty array if no file exists or if the file is invalid.
 */
export function loadProducts(store: string): StoredProduct[] {
  const filePath = path.join(DATA_DIR, `${store}.json`);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error(`⚠️ Failed to read ${filePath}:`, (err as Error).message);
    return [];
  }
}

/**
 * Saves the current product snapshot for a specific store.
 * Skips saving if the data is empty to prevent overwriting valid snapshots.
 */
export function saveProducts(store: string, data: StoredProduct[]): void {
  if (!data || data.length === 0) {
    console.warn(`⚠️ Skipping save for ${store} — no products scraped.`);
    return;
  }

  const filePath = path.join(DATA_DIR, `${store}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`💾 Saved ${data.length} products to ${filePath}`);
}
