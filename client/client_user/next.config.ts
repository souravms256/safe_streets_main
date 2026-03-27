import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // Enable only for production static build
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default nextConfig;
