import type { Route } from "next";

/**
 * Typed route helpers for the client module.
 * `next.config.ts` enables typed routes, so dynamic hrefs are cast once here
 * instead of at every call site. Kept separate from `@/lib/routes` (auth
 * redirect policy) to avoid coupling the two modules.
 */
export function clientDetailRoute(id: string): Route {
  return `/clients/${id}` as Route;
}

export function clientEditRoute(id: string): Route {
  return `/clients/${id}/edit` as Route;
}
