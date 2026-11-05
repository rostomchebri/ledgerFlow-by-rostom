import { defineConfig, devices } from "@playwright/test";

/**
 * OPS-04 — end-to-end configuration.
 *
 * The suite runs against a production build (`pnpm build && pnpm start`) so
 * route content is rendered immediately instead of streaming in after an
 * on-demand dev compilation. The database must be migrated and seeded (see
 * README). `auth.setup.ts` signs in once, then every browser project reuses the
 * session. CI installs and runs Chromium only to keep the job fast; local runs
 * cover all three engines.
 */
const AUTH_FILE = "tests/e2e/.auth/user.json";

const browserProjects = process.env.CI
  ? [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
  : [
      { name: "chromium", use: { ...devices["Desktop Chrome"] } },
      { name: "firefox", use: { ...devices["Desktop Firefox"] } },
      { name: "webkit", use: { ...devices["Desktop Safari"] } },
    ];

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  expect: { timeout: 10_000 },
  timeout: 60_000,
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    ...browserProjects.map((project) => ({
      ...project,
      use: { ...project.use, storageState: AUTH_FILE },
      dependencies: ["setup"],
    })),
  ],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NODE_ENV: "production",
      // The app refuses to boot with the checked-in development secret.
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ?? "e2e-only-secret-not-used-in-production-0000",
    },
  },
});
