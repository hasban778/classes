/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { 
    unoptimized: true 
  },
  swcMinify: false,
  output: 'standalone',
  experimental: {
    swcFileReading: false
  }
};

module.exports = nextConfig;