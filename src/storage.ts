// src/storage.ts
import { PrismaClient } from "@prisma/client";
import type { Product } from "./types";

export const db = new PrismaClient();

/**
 * 🧠 Load all products for a specific store from the database.
 */
export async function loadProducts(store: string): Promise<Product[]> {
  const products = await db.product.findMany({
    where: { store },
  });

  return products.map((p) => ({
    id: p.id,
    store: p.store,
    title: p.title,
    link: p.link,
    price: p.price ?? "Onbekend",
    oldPrice: p.oldPrice ?? undefined,
    inStock: p.inStock ?? false,
    lastSeen: p.lastSeen,
    createdAt: p.createdAt,
  }));
}

/**
 * 💾 Save (insert or update) current products for a store.
 */
export async function saveProducts(store: string, data: Product[]): Promise<void> {
  for (const p of data) {
    await db.product.upsert({
      where: { link: p.link },
      create: {
        store,
        title: p.title,
        link: p.link,
        price: p.price ?? "Onbekend",
        oldPrice: p.oldPrice ?? null,
        inStock: p.inStock ?? true,
      },
      update: {
        price: p.price ?? "Onbekend",
        oldPrice: p.oldPrice ?? null,
        inStock: p.inStock ?? true,
        lastSeen: new Date(),
      },
    });
  }
}
