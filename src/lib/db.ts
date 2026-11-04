/**
 * Backwards-compatible alias for the shared Prisma singleton.
 * `@/lib/prisma` is the canonical client (imports `server-only`).
 */
export { prisma as db } from "@/lib/prisma";
