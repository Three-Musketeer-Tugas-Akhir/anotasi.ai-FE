import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10240mb',
    },
    proxyClientMaxBodySize: '10240mb',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://152.118.31.36:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
