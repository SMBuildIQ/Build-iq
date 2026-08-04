import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@buildiq/design-tokens",
    "@buildiq/types",
    "@buildiq/validation",
    "@buildiq/permissions",
    "@buildiq/pricing",
  ],
};

export default nextConfig;
