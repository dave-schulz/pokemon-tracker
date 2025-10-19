// src/storage.ts
import { db } from "./db";
import type { Product } from "./types";

/**
 * 🧠 Load all products for a specific store from the database.
 */
export async function loadProducts(store: string): Promise<Product[]> {
  const products = await db.product.findMany({
    where: { store },
    orderBy: { id: "asc" },
  });

  // Prisma returns nullables; ensure consistent non-null Product type
  return products.map((p: Product) => ({
    title: p.title,
    price: p.price ?? "Onbekend",
    oldPrice: p.oldPrice ?? undefined,
    link: p.link,
    inStock: p.inStock ?? true,
    store: p.store,
  }));
}

/**
 * 💾 Save (insert or update) products for a given store.
 */
export async function saveProducts(store: string, data: Product[]): Promise<void> {
  for (const p of data) {
    await db.product.upsert({
      where: { link: p.link },
      update: {
        price: p.price,
        oldPrice: p.oldPrice ?? undefined,
        inStock: p.inStock ?? true,
        lastSeen: new Date(),
      },
      create: {
        store,
        title: p.title,
        link: p.link,
        price: p.price,
        oldPrice: p.oldPrice ?? undefined,
        inStock: p.inStock ?? true,
      },
    });
  }
}
