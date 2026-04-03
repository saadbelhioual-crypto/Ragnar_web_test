/** @type {import('next').NextConfig} */
const nextConfig = {
  ignoreBuildErrors: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['axios'],
  },
};

module.exports = nextConfig;