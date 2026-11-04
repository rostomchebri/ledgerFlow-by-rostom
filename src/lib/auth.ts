import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { RATE_LIMIT_DEFAULT, RATE_LIMIT_RULES } from "@/lib/rate-limit-policy";
import { passwordSchema } from "@/lib/validation/auth";

import {
  sendExistingUserSignUpEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./email";

const SESSION_SECONDS = env.AUTH_SESSION_EXPIRES_IN_DAYS * 24 * 60 * 60;

/**
 * AUTH-01 / AUTH-02 / AUTH-03 / AUTH-04 — Better Auth configuration.
 *
 * Security decisions:
 * - e-mail + password only; e-mail verification required before sign-in;
 * - 12-character password minimum plus a composition/deny-list hook;
 * - reset tokens expire after one hour and revoke every existing session;
 * - rate limiting is database-backed so it survives restarts and multiple
 *   app instances (AUTH-04);
 * - sessions are HttpOnly, SameSite=Lax, and secure in production.
 */
export const auth = betterAuth({
  appName: "LedgerFlow",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    env.NEXT_PUBLIC_APP_URL,
    env.BETTER_AUTH_URL,
    ...(env.isDevelopment ? ["http://127.0.0.1:3000"] : []),
  ],

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ to: user.email, name: user.name, url });
    },
    onPasswordReset: async ({ user }) => {
      logger.info("auth.password_reset_completed", { userId: user.id });
    },
    onExistingUserSignUp: async ({ user }) => {
      await sendExistingUserSignUpEmail({ to: user.email, name: user.name });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({ to: user.email, name: user.name, url });
    },
    afterEmailVerification: async (user) => {
      logger.info("auth.email_verified", { userId: user.id });
    },
  },

  session: {
    expiresIn: SESSION_SECONDS,
    updateAge: 24 * 60 * 60,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  rateLimit: {
    enabled: env.AUTH_RATE_LIMIT_ENABLED,
    window: RATE_LIMIT_DEFAULT.window,
    max: RATE_LIMIT_DEFAULT.max,
    storage: "database",
    modelName: "rateLimit",
    customRules: RATE_LIMIT_RULES,
  },

  advanced: {
    cookiePrefix: "ledgerflow",
    useSecureCookies: env.isProduction,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    },
    // Better Auth normalises IPv6 and only trusts single-value forwarded IP
    // headers by default. Configure `trustedProxies` in production if the app
    // sits behind a proxy that appends to X-Forwarded-For.
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email" && ctx.path !== "/reset-password") return;

      const body = ctx.body as { password?: unknown; newPassword?: unknown } | undefined;
      const password =
        typeof body?.password === "string"
          ? body.password
          : typeof body?.newPassword === "string"
            ? body.newPassword
            : undefined;

      const result = passwordSchema.safeParse(password);

      if (!result.success) {
        throw APIError.from("BAD_REQUEST", {
          message:
            result.error.issues[0]?.message ?? "Password does not meet the security requirements.",
          code: "WEAK_PASSWORD",
        });
      }
    }),
  },

  // Must stay last: writes Set-Cookie headers through next/headers when Better
  // Auth is called from server actions or route handlers.
  plugins: [nextCookies()],
});

export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
