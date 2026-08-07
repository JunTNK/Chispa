import type { NextConfig } from "next";

const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true, openAnalyzer: false })
  : (config: NextConfig) => config;

// Sentry integration — wraps the config with error tracking.
// Uses synchronous require to avoid top-level await issues.
// The plugin is a no-op when no DSN is set (local dev).
let sentryWrap = (config: NextConfig) => config;
try {
  const sentry = require('@sentry/nextjs');
  if (sentry.withSentryConfig && (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)) {
    sentryWrap = (config: NextConfig) =>
      sentry.withSentryConfig(config, {
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        // Only upload source maps in CI/production builds
        dryRun: process.env.NODE_ENV !== 'production',
      });
  }
} catch {
  // @sentry/nextjs may not be installed in some environments
  console.warn('[sentry] @sentry/nextjs not available — error tracking disabled');
  // Fall through — no Sentry wrapping
}

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

export default withBundleAnalyzer(sentryWrap(nextConfig));
