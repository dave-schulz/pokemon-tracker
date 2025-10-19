// src/storage.ts
import fs from "fs";

const FILE_PATH = "products.json";

/** Represents a product stored locally between scraper runs. */
export interface StoredProduct {
  title: string;
  price: string;
  link: string;
  inStock?: boolean;
}

/** Loads previously saved products from the local JSON file. */
export function loadProducts(): StoredProduct[] {
  if (!fs.existsSync(FILE_PATH)) return [];
  return JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"));
}

/** Saves all current products to the local JSON file. */
export function saveProducts(data: StoredProduct[]): void {
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}
