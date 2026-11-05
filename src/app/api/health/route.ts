import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/**
 * OPS-03 — liveness/readiness probe. Returns 200 when the database answers,
 * 503 otherwise. No tenant data or secrets are exposed.
 */
export async function GET() {
  const startedAt = Date.now();
  let database: "ok" | "error" = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    database = "error";
    logger.error("health.database_check_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return NextResponse.json(
    {
      status: database === "ok" ? "ok" : "degraded",
      version: process.env.npm_package_version ?? "0.1.0",
      uptimeSeconds: Math.round(process.uptime()),
      checks: { database, durationMs: Date.now() - startedAt },
    },
    {
      status: database === "ok" ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
