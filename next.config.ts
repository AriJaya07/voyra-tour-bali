import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tourism-file.s3.ap-southeast-2.amazonaws.com',
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
    ],
  },
};

export default nextConfig;
