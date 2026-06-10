/** @type {import('next').NextConfig} */
const BACKEND_URL = "https://backend-production-13c9.up.railway.app";

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["recharts"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  },
  // Proxy /api/v1/* to the Railway backend.
  // This lets the mobile APK call https://atlasfieldops.com/api/v1 and reach
  // the real backend, and removes the Railway URL from frontend env vars.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
