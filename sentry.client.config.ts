/**
 * Sentry Client Configuration
 *
 * This file configures Sentry for the browser (client-side).
 * The DSN is read from NEXT_PUBLIC_SENTRY_DSN environment variable.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,

  // Performance monitoring — sample rate 10% in production to save quota
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Replay (session recording) — disabled for now to keep free tier quota
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Only send errors in production (local dev would clutter the dashboard)
  enabled: process.env.NODE_ENV === 'production',

  // Useful for debugging Sentry itself
  debug: false,
});
