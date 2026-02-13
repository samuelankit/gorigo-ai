/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  reactStrictMode: true,
  allowedDevOrigins: [
    '*.picard.replit.dev',
    '*.replit.dev',
    '*.replit.app',
    'http://localhost:5000',
    'http://0.0.0.0:5000',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
