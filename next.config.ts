import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // Static export
  reactStrictMode: true,
  images: {
    unoptimized: true,  // Required for static export
  },
};

export default nextConfig;
