import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
