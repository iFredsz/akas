/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",   // izinkan semua domain https
      },
      {
        protocol: "http",
        hostname: "**",   // izinkan semua domain http
      },
    ],
  },
};

module.exports = nextConfig;
