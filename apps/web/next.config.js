/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  transpilePackages: ['@maskwise/shared', '@maskwise/types'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Performance optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Optimize bundle splitting
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk for node_modules
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Separate chunk for Monaco Editor (large dependency)
          monaco: {
            name: 'monaco',
            test: /[\\/]node_modules[\\/](@monaco-editor|monaco-editor)[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          // Separate chunk for Recharts
          recharts: {
            name: 'recharts',
            test: /[\\/]node_modules[\\/](recharts|d3-.*)[\\/]/,
            chunks: 'all',
            priority: 25,
          },
          // Common chunk for shared code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };
    }
    
    return config;
  },
  
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
  
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-*'],
  },
};

module.exports = withBundleAnalyzer(nextConfig);