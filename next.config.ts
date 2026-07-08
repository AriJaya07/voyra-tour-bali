import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/plan", destination: "/ai/plan", permanent: true },
      { source: "/plans", destination: "/ai/pricing", permanent: true },
      { source: "/profile/ai", destination: "/ai/wallet", permanent: true },
      { source: "/profile/ai/tools", destination: "/ai/tools", permanent: true },
      { source: "/profile/itineraries", destination: "/trips", permanent: true },
      { source: "/profile/calendar", destination: "/trips/calendar", permanent: true },
    ];
  },
  images: {
    deviceSizes: [640, 1080, 1920],
    imageSizes: [64, 256, 512],
    formats: ['image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tourism-file.s3.ap-southeast-2.amazonaws.com',
      },
      {
        // Google account avatars (OAuth sign-in)
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'hare-media-cdn.tripadvisor.com',
      },
      {
        protocol: 'https',
        hostname: 'media-cdn.tripadvisor.com',
      },
      {
        protocol: 'https',
        hostname: 'media.tacdn.com',
      },
      {
        protocol: 'https',
        hostname: 'dynamic-media.tacdn.com',
      },
      {
        protocol: 'https',
        hostname: '*.viator.com',
      },
      {
        protocol: 'https',
        hostname: 'traveller-be.onrender.com',
      },
      {
        protocol: 'https',
        hostname: 'blog-turism.s3.ap-southeast-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'be.balitravelnow.com',
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
