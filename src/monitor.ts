// src/monitor.ts
import type { StoredProduct } from "./storage";

/** Represents the detected changes between old and new product lists. */
export interface ProductChanges {
  newProducts: StoredProduct[];
  priceDrops: StoredProduct[];
  restocked: StoredProduct[];
}

/** Compares old and new product data to detect new listings, price drops, and restocks. */
export function detectChanges(
  oldProducts: StoredProduct[],
  newProducts: StoredProduct[],
): ProductChanges {
  const oldMap = new Map(oldProducts.map((p) => [p.link, p]));
  const newMap = new Map(newProducts.map((p) => [p.link, p]));

  const newOnes: StoredProduct[] = [];
  const priceDrops: StoredProduct[] = [];
  const restocked: StoredProduct[] = [];

  // Iterates through all new products and compares them with previously saved data.
  for (const product of newProducts) {
    const old = oldMap.get(product.link);
    if (!old) {
      newOnes.push(product);
    } else {
      // Detects if the product price has decreased.
      const oldPriceNum = parseFloat(old.price.replace(/[^\d,]/g, "").replace(",", "."));
      const newPriceNum = parseFloat(product.price.replace(/[^\d,]/g, "").replace(",", "."));
      if (newPriceNum < oldPriceNum) priceDrops.push(product);

      // Detects if an item that was out of stock is available again.
      if (old.inStock === false && product.inStock !== false) {
        restocked.push(product);
      }
    }
  }

  return { newProducts: newOnes, priceDrops, restocked };
}
