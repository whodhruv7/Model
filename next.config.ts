import type { NextConfig } from "next";

/* STATIC_EXPORT=1 NEXT_PUBLIC_BASE_PATH=/maths -> static export for GitHub Pages */
const isStatic = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  output: isStatic ? "export" : "standalone",
  ...(isStatic ? { basePath: "/maths", images: { unoptimized: true } } : {}),
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
