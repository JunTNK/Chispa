/**
 * CHISPA Analytics — Structured event tracking for product metrics.
 *
 * Tracks user actions for D7/D30 retention analysis.
 * Events are forwarded to Sentry in production as metrics (no PII).
 *
 * Neurodivergent design:
 * - No tracking of body metrics (weight, IMC, measurements)
 * - No tracking of session duration for punishment
 * - Events celebrate behavior, not performance
 */

const PREFIX = '[CHISPA-ANALYTICS]';

export type AnalyticsEvent =
  | 'session_start'
  | 'session_complete'
  | 'session_skip'
  | 'achievement_unlocked'
  | 'boss_defeated'
  | 'quest_completed'
  | 'theme_selected'
  | 'tutorial_completed'
  | 'onboarding_done'
  | 'd7_retention_check'
  | 'd30_retention_check'
  | 'pro_trial_started'
  | 'pro_purchase_completed'
  | 'share_achievement'
  | 'pro_purchase_initiated';

export interface AnalyticsContext {
  [key: string]: unknown;
}

/** Track an analytics event — no-op if disabled */
export function trackEvent(
  event: AnalyticsEvent,
  ctx?: AnalyticsContext,
): void {
  if (process.env.NODE_ENV !== 'production') return;

  const payload: { event: AnalyticsEvent; timestamp: string; context?: AnalyticsContext } = {
    event,
    timestamp: new Date().toISOString(),
  };
  if (ctx) payload.context = ctx;

  // Log to console for debugging (stripped in prod build)
  if (process.env.NEXT_PUBLIC_DEBUG_ANALYTICS === '1') {
    console.log(`${PREFIX} ${event}`, ctx ?? '');
  }

  // Forward to Sentry as metrics — lazy dynamic import so the heavy Sentry
  // SDK stays OUT of the initial client bundle. Only loaded when a DSN is
  // configured (production) and an event is actually reported.
  try {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
      import('@sentry/nextjs').then(({ captureEvent }) => {
        captureEvent({
          message: `chispa.${event}`,
          level: 'info',
          tags: { event_type: event },
          extra: ctx,
        });
      }).catch(() => {
        // Sentry not available — silently continue
      });
    }
  } catch {
    // Sentry not available — silently continue
  }
}

/**
 * Track daily active user — for D7/D30 retention.
 * Called on app mount to measure stickiness.
 */
export function trackDAU(): void {
  const today = new Date().toISOString().slice(0, 10);
  const lastDAU = localStorage.getItem('chispa_last_dau');
  if (lastDAU !== today) {
    localStorage.setItem('chispa_last_dau', today);

    // Track daily activity for retention analysis
    const firstDay = localStorage.getItem('chispa_first_day');
    if (!firstDay) {
      localStorage.setItem('chispa_first_day', today);
    }

    // Append to daily activity log (array of dates)
    const logStr = localStorage.getItem('chispa_daily_log') || '[]';
    try {
      const log: string[] = JSON.parse(logStr);
      log.push(today);
      // Keep only last 90 days
      const recent = log.slice(-90);
      localStorage.setItem('chispa_daily_log', JSON.stringify(recent));
    } catch {
      localStorage.setItem('chispa_daily_log', JSON.stringify([today]));
    }

    trackEvent('d7_retention_check', { first_day: firstDay || today });
  }
}

/**
 * Calculate retention metrics from daily activity log.
 * D1: user returned 1 day after their first/earliest tracked day
 * D7: user returned within 7 days of their first tracked day
 * D30: user returned within 30 days of their first tracked day
 */
export function getRetentionMetrics(): {
  totalActiveDays: number;
  d1Retained: boolean;
  d7Retained: boolean;
  d30Retained: boolean;
  firstDay: string | null;
  activeDays: string[];
} {
  const firstDay = localStorage.getItem('chispa_first_day');
  const logStr = localStorage.getItem('chispa_daily_log') || '[]';
  let activeDays: string[] = [];
  try {
    activeDays = JSON.parse(logStr);
  } catch {
    activeDays = [firstDay].filter(Boolean) as string[];
  }

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  let d1Retained = false;
  let d7Retained = false;
  let d30Retained = false;

  if (firstDay && activeDays.length > 0) {
    const firstDate = new Date(firstDay);
    const d1 = new Date(firstDate.getTime() + 86400000).toISOString().slice(0, 10);
    const d7 = new Date(firstDate.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const d30 = new Date(firstDate.getTime() + 30 * 86400000).toISOString().slice(0, 10);

    d1Retained = activeDays.includes(d1) || activeDays.includes(todayStr);
    d7Retained = activeDays.includes(d7) || activeDays.includes(todayStr);
    d30Retained = activeDays.includes(d30) || activeDays.includes(todayStr);
  }

  return {
    totalActiveDays: activeDays.length,
    d1Retained,
    d7Retained,
    d30Retained,
    firstDay,
    activeDays,
  };
}

/**
 * Días distintos con movimiento en una ventana rodante (sin rachas que se rompen).
 * La métrica real de CHISPA: volver importa más que no irse nunca.
 */
export function getMovementDaysRolling(workouts: { date: string; completed_rate: number }[], windowDays = 30): number {
  const cutoff = Date.now() - windowDays * 86400000;
  return new Set(
    workouts
      .filter((w) => w.completed_rate >= 0.5 && new Date(w.date).getTime() >= cutoff)
      .map((w) => w.date)
  ).size;
}

/**
 * Get retention info for analytics/debug.
 */
export function getRetentionInfo(): { firstDay: string | null; lastDAU: string | null } {
  const firstDay = localStorage.getItem('chispa_first_day');
  const lastDAU = localStorage.getItem('chispa_last_dau');
  return { firstDay, lastDAU };
}
