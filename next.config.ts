import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,  // Enable React Strict Mode (recommended)
  // Remove swcMinify since it's not needed anymore
};

export default nextConfig;
