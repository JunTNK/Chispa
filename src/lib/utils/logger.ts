/**
 * CHISPA — Structured logger for consistent error handling.
 *
 * Provides context-aware error handlers for `.catch()` chains.
 * Every error log includes a [CHISPA] prefix, a context label, and a timestamp.
 * When Sentry is available in production, errors are also forwarded there.
 */

const PREFIX = '[CHISPA]';

/** Format a structured error message */
function fmt(context: string, err: unknown): string {
  const ts = new Date().toISOString().slice(11, 19);
  const msg = err instanceof Error ? err.message : String(err ?? 'unknown error');
  return `${PREFIX} ${context} — ${msg} (${ts})`;
}

/** Lazy import Sentry — only when needed, never blocks the app */
function captureToSentry(err: unknown, context: string) {
  if (process.env.NODE_ENV !== 'production') return;
  // Guard: `require` is undefined in browser bundles
  if (typeof require === 'undefined') return;
  try {
    const Sentry = require('@sentry/nextjs');
    Sentry?.captureException?.(err instanceof Error ? err : new Error(String(err)), {
      tags: { context },
    });
  } catch {
    // Sentry not available — silently continue (errors still logged to console)
  }
}

/**
 * Returns a `.catch()` handler that logs the error with context.
 * The handler always returns `undefined`, so it won't interfere with promise chains.
 *
 * @example
 *   supabaseSync.pull().catch(logError('sync:pull'))
 *   fetchData().catch(logError('fetch'))
 */
export function logError(context: string) {
  return (err: unknown): undefined => {
    console.error(fmt(context, err));
    captureToSentry(err, context);
    return undefined;
  };
}

/**
 * Returns a `.catch()` handler that logs the error and returns a fallback value.
 *
 * @example
 *   fetchLeaderboard(50).catch(fallback('fetch:leaderboard', []))
 */
export function fallback<T>(context: string, value: T) {
  return (err: unknown): T => {
    console.error(fmt(context, err));
    captureToSentry(err, context);
    return value;
  };
}
