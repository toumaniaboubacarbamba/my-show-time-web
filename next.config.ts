import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
   images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ['192.168.1.129'],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
