import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "@react-pdf/renderer",
    "qrcode",
  ],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;