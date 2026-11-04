import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ApiError } from "@/lib/api-error";
import { auth, type AuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * Next.js signals dynamic rendering with a special error. It must be rethrown
 * so the route is marked dynamic instead of being statically rendered as
 * signed out during `next build`.
 */
function isDynamicServerUsageError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    (error as { digest?: unknown }).digest === "DYNAMIC_SERVER_USAGE"
  );
}

/**
 * Reads and validates the Better Auth session on the server.
 *
 * `cache` deduplicates the lookup inside a single request (layout + page).
 * A database failure fails closed: the visitor is treated as signed out.
 */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    if (isDynamicServerUsageError(error)) throw error;

    logger.error("auth.session_lookup_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
});

/** Server component / layout guard. */
export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

/** Redirect authenticated visitors away from login/register/forgot pages. */
export async function requireGuest(): Promise<void> {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }
}

/** Route-handler guard. Returns 401 instead of redirecting API clients. */
export async function requireApiSession(): Promise<AuthSession> {
  const session = await getSession();

  if (!session) {
    throw new ApiError("UNAUTHORIZED", "Authentication required.");
  }

  return session;
}
