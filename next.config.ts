import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This conflicts with route segment config like:
  // export const dynamic = "force-dynamic"
  // and is causing your Turbopack build to fail.
  cacheComponents: false,
};

export default nextConfig;
