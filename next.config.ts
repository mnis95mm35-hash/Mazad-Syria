import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 5 صور × 3 ميغابايت كحد أقصى + بقية الحقول
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
