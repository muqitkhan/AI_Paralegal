/** @type {import('next').NextConfig} */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "http://localhost:8000";

const nextConfig = {
  experimental: {},
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "graph.microsoft.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
