import fs from "fs";
import path from "path";
import { Product } from "./types";

/**
 * Ensures that the /data folder exists, and returns the JSON file path for the given store.
 */
function getFilePath(store: string): string {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return path.join(dataDir, `products-${store}.json`);
}

/**
 * Loads previously saved products for a specific store.
 */
export function loadProducts(store: string): Product[] {
  const file = getFilePath(store);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (err) {
    console.error(`❌ Error reading data for ${store}:`, (err as Error).message);
    return [];
  }
}

/**
 * Saves all current products for a specific store.
 */
export function saveProducts(store: string, data: Product[]): void {
  const file = getFilePath(store);
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`❌ Error saving data for ${store}:`, (err as Error).message);
  }
}
