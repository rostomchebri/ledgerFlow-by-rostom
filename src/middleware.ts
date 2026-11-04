import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { buildLoginRedirect, isGuestOnlyPath, isProtectedPath } from "@/lib/routes";

const SESSION_COOKIE_PREFIX = "ledgerflow";

/**
 * AUTH-03 — optimistic route protection.
 *
 * Middleware only checks that a session cookie exists; the signature and
 * expiry are validated server-side in `requireSession()` / `requireApiSession()`.
 * This keeps the edge bundle free of Prisma while still avoiding a flash of
 * protected content.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(
    getSessionCookie(request, { cookiePrefix: SESSION_COOKIE_PREFIX }),
  );

  if (!hasSessionCookie && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL(buildLoginRedirect(pathname, search), request.url));
  }

  if (hasSessionCookie && isGuestOnlyPath(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
