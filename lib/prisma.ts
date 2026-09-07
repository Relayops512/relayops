import { PrismaClient } from "@prisma/client";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.VERCEL) {
    return "file:/tmp/relayops.db";
  }
  return "file:" + path.join(process.cwd(), "prisma", "dev.db");
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = resolveDatabaseUrl();
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
