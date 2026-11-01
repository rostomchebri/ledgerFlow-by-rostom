import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Typed routes are enabled later (SETUP-06) once the route map is stable.
  typedRoutes: false,
  experimental: {
    // Keep server actions conservative until SETUP-06 defines API conventions.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default withNextIntl(nextConfig);
