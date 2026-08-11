/**
 * Sentry Server Configuration
 *
 * This file configures Sentry for Node.js server-side (API routes, server components).
 * The DSN is read from SENTRY_DSN environment variable.
 *
 * Bundle optimization:
 * - Uses selective imports for tree-shaking
 * - Browser-specific integrations excluded
 * - Console logging disabled
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
import { init } from '@sentry/nextjs';

// Only initialize if DSN is available and in production
if (process.env.NODE_ENV === 'production' && (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)) {
  init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance monitoring — sample rate 10% in production
    tracesSampleRate: 0.1,

    // Disable debug mode
    debug: false,

    // Server-side: exclude browser-specific integrations
    integrations: (integrations) => {
      return integrations.filter((integration) => {
        const name = integration.name;
        return !['BrowserTracing', 'HttpContext', 'BrowserHttpClient'].includes(name);
      });
    },
  });
}
