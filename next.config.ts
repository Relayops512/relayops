import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the SQLite file to be generated at build/runtime in serverless /tmp.
  serverExternalPackages: ["@prisma/client", "prisma"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
