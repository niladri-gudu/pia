import { loadEnv } from "@project-intelligence/config";
import { PrismaClient } from "@prisma/client";

loadEnv();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Singleton Prisma client.
 *
 * Reuses the client across hot-reloads in development to avoid exhausting
 * database connections.
 */
export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
