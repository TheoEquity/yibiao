import type { NextConfig } from 'next';

const distDir = process.env.NEXT_DIST_DIR?.trim() || '.next';

const nextConfig: NextConfig = {
  distDir,
  allowedDevOrigins: ['*.monkeycode-ai.online'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3001/:path*',
      },
    ];
  },
};

export default nextConfig;
