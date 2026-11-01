/**
 * Typed environment configuration.
 * Placeholder for SETUP-03 — replace with full Zod-validated schema.
 */
export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;
