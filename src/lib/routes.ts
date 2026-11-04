/**
 * Route protection map (AUTH-03).
 *
 * LedgerFlow uses cookie-based i18n (no locale prefix), so paths here are the
 * real browser paths. Keep this list in sync with the middleware and the
 * server-side guards.
 */
export const PROTECTED_PATHS = [
  "/dashboard",
  "/clients",
  "/onboarding",
  "/settings",
  "/invitations",
] as const;

export const GUEST_ONLY_PATHS = ["/login", "/register", "/forgot-password"] as const;

export const AUTH_PATHS = [...GUEST_ONLY_PATHS, "/reset-password", "/verify-email"] as const;

function matchesPath(pathname: string, paths: readonly string[]): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function normalizePath(pathname: string): string {
  if (!pathname) return "/";

  const withoutQuery = pathname.split("?")[0] ?? "/";
  const collapsed = withoutQuery.replace(/\/{2,}/g, "/");

  if (collapsed.length > 1 && collapsed.endsWith("/")) return collapsed.slice(0, -1);

  return collapsed;
}

export function isProtectedPath(pathname: string): boolean {
  return matchesPath(normalizePath(pathname), PROTECTED_PATHS);
}

export function isGuestOnlyPath(pathname: string): boolean {
  return matchesPath(normalizePath(pathname), GUEST_ONLY_PATHS);
}

export function isAuthPath(pathname: string): boolean {
  return matchesPath(normalizePath(pathname), AUTH_PATHS);
}

/** Build a login URL that returns the user to the page they asked for. */
export function buildLoginRedirect(pathname: string, search = ""): string {
  const callbackUrl = `${normalizePath(pathname)}${search}`;
  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}
