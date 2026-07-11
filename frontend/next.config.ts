import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export so Vercel can serve the Matrix UI from /public
  // alongside the FastAPI function at /api/*
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
