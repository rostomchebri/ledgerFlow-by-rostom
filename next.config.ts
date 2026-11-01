import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Typed routes are enabled later (SETUP-05/06) once the route map is stable.
  typedRoutes: false,
  experimental: {
    // Keep server actions conservative until SETUP-06 defines API conventions.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
