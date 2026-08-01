import { PrismaClient } from "@prisma/client";

/**
 * Process-wide Prisma client singleton. In dev with hot-reload, a bare
 * `new PrismaClient()` on every reload exhausts Postgres connections, so we
 * stash the instance on globalThis outside of production.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
