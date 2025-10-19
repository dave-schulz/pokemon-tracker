// src/monitor.ts
import { Product } from "./types";

/** Represents the detected changes between old and new product lists. */
export interface ProductChanges {
  newProducts: Product[];
  priceDrops: Product[];
  restocked: Product[];
}

/** Safely parses a price string like "€ 12,99" to a float. */
function parsePrice(value?: string | null): number {
  if (!value) return NaN;
  const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".");
  return parseFloat(cleaned);
}

/** Compares old and new product data to detect new listings, price drops, and restocks. */
export function detectChanges(oldProducts: Product[], newProducts: Product[]): ProductChanges {
  const oldMap = new Map(oldProducts.map((p) => [p.link, p]));

  const newOnes: Product[] = [];
  const priceDrops: Product[] = [];
  const restocked: Product[] = [];

  for (const product of newProducts) {
    const old = oldMap.get(product.link);

    // 🆕 Nieuw product
    if (!old) {
      newOnes.push(product);
      continue;
    }

    // 💸 Prijsdaling check
    const oldPriceNum = parsePrice(old.price);
    const newPriceNum = parsePrice(product.price);

    if (!isNaN(oldPriceNum) && !isNaN(newPriceNum) && newPriceNum < oldPriceNum) {
      priceDrops.push({
        ...product,
        oldPrice: old.price ?? undefined, // voeg oude prijs toe voor Discord
      });
    }

    // 📦 Restock check
    const wasOutOfStock = old.inStock === false;
    const isNowInStock =
      product.inStock !== false && product.inStock !== null && product.inStock !== undefined;

    if (wasOutOfStock && isNowInStock) {
      restocked.push(product);
    }
  }

  return { newProducts: newOnes, priceDrops, restocked };
}
