import type { NextConfig } from "next";

const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true, openAnalyzer: false })
  : (config: NextConfig) => config;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/neurofit',
        destination: '/neurofit-v3.html',
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.qwenlm.ai',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // webpack is a transitive dependency of Next.js — use require()
      const webpack = require('webpack');

      // Prevent webpack from bundling onnxruntime-node (used by transformers.js only in Node)
      config.externals = [...(config.externals || []), 'onnxruntime-node'];

      // Ignore .node binary files that onnxruntime-node ships
      config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /\.node$/ }));

      config.resolve.fallback = {
        ...config.resolve.fallback,
        'onnxruntime-node': false,
        'onnxruntime-web': false,
        fs: false,
        path: false,
      };
    }
    return config;
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
    {
      source: '/manifest.json',
      headers: [
        { key: 'Content-Type', value: 'application/manifest+json' },
        { key: 'Cache-Control', value: 'public, max-age=0' },
      ],
    },
  ],
};

export default withBundleAnalyzer(nextConfig);
