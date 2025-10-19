// src/db.ts
import { PrismaClient } from "@prisma/client";

// 🧠 Singleton pattern to prevent multiple Prisma connections in dev environments
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
