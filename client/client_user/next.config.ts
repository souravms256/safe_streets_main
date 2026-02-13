import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  /* 
   * Strict Error Checking Enabled 
   * The user wants to see and fix all errors. 
   */
};

export default nextConfig;
