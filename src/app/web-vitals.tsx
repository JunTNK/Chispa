'use client';

import { useReportWebVitals } from 'next/web-vitals';

type MetricRating = 'good' | 'needs-improvement' | 'poor';
type MetricName =
  | 'FCP' | 'LCP' | 'CLS' | 'FID' | 'INP' | 'TTFB'
  | 'Next.js-hydration'
  | 'Next.js-route-change-to-render'
  | 'Next.js-render';

interface Metric {
  id: string;
  name: MetricName;
  startTime: number;
  value: number;
  rating: MetricRating;
  navigationType: string;
  attribution?: Record<string, unknown>;
}

/**
 * Color mapping for metric ratings.
 */
const RATING_COLORS: Record<MetricRating, string> = {
  good: '#34d399',
  'needs-improvement': '#fbbf24',
  poor: '#f87171',
};

/**
 * Human-readable labels for each metric.
 */
const METRIC_LABELS: Record<MetricName, string> = {
  FCP: 'First Contentful Paint',
  LCP: 'Largest Contentful Paint',
  CLS: 'Cumulative Layout Shift',
  FID: 'First Input Delay',
  INP: 'Interaction to Next Paint',
  TTFB: 'Time to First Byte',
  'Next.js-hydration': 'Hydratación',
  'Next.js-route-change-to-render': 'Cambio de ruta → render',
  'Next.js-render': 'Render',
};

/**
 * Format metric value for display.
 */
function formatValue(name: MetricName, value: number): string {
  switch (name) {
    case 'CLS':
      return value.toFixed(3);
    case 'FCP':
    case 'LCP':
    case 'TTFB':
      return `${(value / 1000).toFixed(2)}s`;
    default:
      return `${Math.round(value)}ms`;
  }
}

/**
 * WebVitals — Client component that captures and reports Core Web Vitals.
 *
 * In development: logs metrics to console with color-coded styling.
 * In production: sends metrics to /api/analytics via sendBeacon.
 */
export function WebVitals() {
  useReportWebVitals((metric: Metric) => {
    const { name, value, rating } = metric;

    if (process.env.NODE_ENV === 'development') {
      // Color-coded console output for dev
      const color = RATING_COLORS[rating] || '#94a0b8';
      const label = METRIC_LABELS[name] || name;
      console.log(
        `%c📊 ${label}`,
        `color:${color};font-weight:bold;font-size:12px`,
        `→ ${formatValue(name, value)} (${rating})`,
        metric.attribution ? { ...metric.attribution } : ''
      );
      return;
    }

    // Production: send to analytics endpoint via sendBeacon
    try {
      const body = JSON.stringify({
        id: metric.id,
        name,
        value,
        rating,
        navigationType: metric.navigationType,
        url: window.location.pathname,
        timestamp: Date.now(),
      });

      // Use sendBeacon (non-blocking, survives page unload)
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics', body);
      } else {
        fetch('/api/analytics', {
          method: 'POST',
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Silently fail — metrics are non-critical
    }
  });

  return null;
}
