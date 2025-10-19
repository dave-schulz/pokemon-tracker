import fs from "fs";
import path from "path";
import { Product } from "./scraper";

const filePath = path.resolve("data/pokemon-products.json");

export function saveProducts(products: Product[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");
}

export function loadProducts(): Product[] {
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, "utf-8");
  try {
    return JSON.parse(data) as Product[];
  } catch {
    return [];
  }
}
