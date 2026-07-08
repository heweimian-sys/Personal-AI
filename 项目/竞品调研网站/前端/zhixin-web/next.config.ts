import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许跨域请求后端 API
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
