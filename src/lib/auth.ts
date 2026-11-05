import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { RATE_LIMIT_DEFAULT, RATE_LIMIT_RULES } from "@/lib/rate-limit-policy";
import { passwordSchema } from "@/lib/validation/auth";

import {
  sendExistingUserSignUpEmail,
  sendPasswordResetEmail,
  sendVerificationCodeEmail,
  VERIFICATION_CODE_EXPIRES_IN_MINUTES,
} from "./email";

const SESSION_SECONDS = env.AUTH_SESSION_EXPIRES_IN_DAYS * 24 * 60 * 60;

const extraTrustedOrigins = (env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  appName: "LedgerFlow",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  trustedOrigins: [
    env.NEXT_PUBLIC_APP_URL,
    env.BETTER_AUTH_URL,
    ...extraTrustedOrigins,
    // Local development is often opened on a different loopback host or port
    // (e.g. a second `next dev` picks 3001). Trust every loopback port there so
    // an origin mismatch cannot surface as a confusing "Access denied." error.
    ...(env.isDevelopment
      ? ["http://localhost:*", "http://127.0.0.1:*", "http://[::1]:*"]
      : []),
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
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        url,
      });
    },

    onPasswordReset: async ({ user }) => {
      logger.info("auth.password_reset_completed", {
        userId: user.id,
      });
    },

    onExistingUserSignUp: async ({ user }) => {
      await sendExistingUserSignUpEmail({
        to: user.email,
        name: user.name,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: VERIFICATION_CODE_EXPIRES_IN_MINUTES * 60,

    afterEmailVerification: async (user) => {
      logger.info("auth.email_verified", {
        userId: user.id,
      });
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
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email" && ctx.path !== "/reset-password") {
        return;
      }

      const body = ctx.body as
        | {
            password?: unknown;
            newPassword?: unknown;
          }
        | undefined;

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

  plugins: [
    emailOTP({
      // Reuse the e-mail verification lifecycle (send on sign-up / sign-in)
      // but deliver a numeric code instead of a click-to-verify link.
      overrideDefaultEmailVerification: true,
      otpLength: 6,
      expiresIn: VERIFICATION_CODE_EXPIRES_IN_MINUTES * 60,
      allowedAttempts: 5,
      storeOTP: "hashed",
      sendVerificationOTP: async ({ email, otp, type }, ctx) => {
        if (type !== "email-verification") return;

        const acceptLanguage =
          ctx?.request?.headers?.get("accept-language") ??
          ctx?.headers?.get("accept-language") ??
          null;

        await sendVerificationCodeEmail({
          to: email,
          code: otp,
          acceptLanguage,
        });
      },
    }),
    nextCookies(),
  ],
});

export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
