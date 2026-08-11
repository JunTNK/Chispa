/**
 * Sentry Client Configuration
 *
 * This file configures Sentry for the browser (client-side).
 * The DSN is read from NEXT_PUBLIC_SENTRY_DSN environment variable.
 *
 * Bundle optimization:
 * - Uses selective imports instead of `import *` for tree-shaking
 * - Replay disabled to save ~200KB
 * - Console logging disabled to remove internal logger code
 * - Integrations filtered to include only what's needed
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
import { init, captureException } from '@sentry/nextjs';

// Only initialize if DSN is available and in production
if (process.env.NODE_ENV === 'production' && (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN)) {
  init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,

    // Performance monitoring — sample rate 10% in production to save quota
    tracesSampleRate: 0.1,

    // Replay (session recording) — disabled to save ~200KB bundle
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Disable debug mode
    debug: false,

    // Filter integrations to reduce bundle — only include essential ones
    integrations: (integrations) => {
      return integrations.filter((integration) => {
        // Keep: GlobalHandlers, InboundFilters, FunctionToString, Breadcrumbs
        // Remove: TryCatch (browser-specific), Http (not needed client-side)
        const name = integration.name;
        return !['BrowserTracing', 'Http', 'HttpContext'].includes(name);
      });
    },
  });
}

export { captureException };
