import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  generateBuildId: async () => 'aerismp-build',
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "image.fnbr.co" },
      { protocol: "https", hostname: "fortnite-api.com" },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  devIndicators: false,
  webpack: (config) => {
    config.resolve.alias["@apps-socket/core"] = path.resolve(
      __dirname,
      "src/core"
    );
    return config;
  },
};

export default nextConfig;
