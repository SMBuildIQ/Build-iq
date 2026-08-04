import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["exceljs", "@prisma/client", "prisma"],
};

export default nextConfig;
