/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  devIndicators: false,
  experimental: { serverActions: { allowedOrigins: ['localhost:3000'] } },
};
export default nextConfig;
