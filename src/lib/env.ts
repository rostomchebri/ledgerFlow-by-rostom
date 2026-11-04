import "server-only";

import { z } from "zod";

/**
 * Typed, validated environment configuration.
 *
 * Development defaults keep the app bootable on a fresh checkout. Production
 * requires real values (the app refuses to start with the development secret).
 */
const DEV_SECRET = "ledgerflow-local-dev-secret-change-me-please";

const booleanFromString = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://ledgerflow:ledgerflow@localhost:5432/ledgerflow?schema=public"),

  BETTER_AUTH_SECRET: z.string().min(32).default(DEV_SECRET),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),

  AUTH_RATE_LIMIT_ENABLED: booleanFromString,
  AUTH_SESSION_EXPIRES_IN_DAYS: z.coerce.number().int().min(1).max(30).default(7),

  // DOC-01 / DOC-03 — S3-compatible object storage (MinIO locally).
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_BUCKET: z.string().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_FORCE_PATH_STYLE: booleanFromString,

  // NOTIF-02 — pg-boss reuses DATABASE_URL and isolates its tables in a schema.
  JOBS_SCHEMA: z.string().min(1).default("pgboss"),

  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().min(1).default("LedgerFlow <no-reply@ledgerflow.local>"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid environment configuration:\n${details}`);
}

const data = parsed.data;

if (data.NODE_ENV === "production" && data.BETTER_AUTH_SECRET === DEV_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET must be set to a unique value in production (openssl rand -base64 32).",
  );
}

export const env = {
  ...data,
  isProduction: data.NODE_ENV === "production",
  isDevelopment: data.NODE_ENV !== "production",
} as const;
