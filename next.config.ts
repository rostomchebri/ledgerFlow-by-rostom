import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // OPS-01 — self-contained server bundle for the production image. The Docker
  // builder sets NEXT_STANDALONE=1; local builds keep the standard output so
  // `next start` (used by the E2E suite) stays supported.
  ...(process.env.NEXT_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  poweredByHeader: false,
  // Locale catalogs are imported dynamically (`messages/${locale}.json`), so
  // force them into the standalone trace. Prisma's client and engine are traced
  // automatically from their real pnpm-store location.
  outputFileTracingIncludes: {
    "/*": ["./messages/**/*"],
  },
  // Typed routes are enabled later (SETUP-06) once the route map is stable.
  typedRoutes: false,
  experimental: {
    // Keep server actions conservative until SETUP-06 defines API conventions.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // OPS-05 — conservative security headers. TLS/HSTS is terminated at the
  // reverse proxy in production.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
