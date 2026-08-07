/**
 * Sentry Edge Configuration
 *
 * This file configures Sentry for Edge Runtime (middleware, edge functions).
 * The DSN is read from SENTRY_DSN environment variable.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring — sample rate 10% in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Only send errors in production
  enabled: process.env.NODE_ENV === 'production',

  debug: false,
});
