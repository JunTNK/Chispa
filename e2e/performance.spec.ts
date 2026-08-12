import { test, expect } from '@playwright/test';
import { navigateOnboarding } from './helpers';

/**
 * Performance thresholds — ajustar según la app real.
 * These are sensible defaults for a Next.js SPA with lazy loading.
 */
const THRESHOLDS = {
  /** Total transferred JS for first page load (KB) */
  maxJsBundleKb: 200,
  /** Maximum number of JS chunks loaded on initial page */
  maxJsChunks: 25,
  /** LCP should be < 2.5s for 'good' rating */
  lcpMaxMs: 2500,
  /** CLS should be < 0.1 for 'good' rating */
  clsMaxScore: 0.1,
  /** TTFB should be < 800ms for 'good' rating */
  ttfbMaxMs: 800,
  /** Page should not have console errors */
  consoleErrors: 0,
  /** 404 resources */
  maxFailedResources: 0,
  /** Number of network requests for initial page
   * (31 medidos en la welcome actual: chunks, fuentes, manifest, etc.) */
  maxTotalRequests: 40,
};

/**
 * Capture LCP via PerformanceObserver inside the browser.
 * Works in both dev and production (unlike console-based capture).
 */
async function captureLcp(page: any, timeoutMs = 5000): Promise<number> {
  return page.evaluate((tmo: number) => {
    return new Promise<number>((resolve) => {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1] as any;
          if (last && last.startTime > 0) {
            resolve(last.startTime);
            observer.disconnect();
          }
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(0);
        }, tmo);
      } catch {
        resolve(0);
      }
    });
  }, timeoutMs);
}

test.describe('Performance — carga y métricas', () => {
  test('1. Welcome page carga dentro de umbrales de rendimiento', async ({ page }) => {
    const resources: {
      url: string;
      status: number;
      size: number;
      type: string;
    }[] = [];
    const errors: string[] = [];
    let totalRequests = 0;

    // Track network requests
    page.on('request', () => totalRequests++);
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('response', (resp) => {
      const url = resp.url();
      const status = resp.status();
      if (url.includes('/_next/static/')) {
        const cl = resp.headers()['content-length'];
        const size = cl ? parseInt(cl, 10) : 0;
        const type = url.endsWith('.js') ? 'js' : url.endsWith('.css') ? 'css' : 'other';
        resources.push({ url, status, size, type });
      }
      if (status >= 400) {
        errors.push(`HTTP ${status}: ${url}`);
      }
    });

    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Start LCP capture AFTER navigation (context must be stable)
    const lcpPromise = captureLcp(page);

    // ── Verify no 404s ──
    const failedResources = resources.filter((r) => r.status >= 400);
    expect(failedResources.length).toBeLessThanOrEqual(THRESHOLDS.maxFailedResources);

    // ── Verify JS bundle sizes ──
    const jsChunks = resources.filter((r) => r.type === 'js' && r.status === 200);
    expect(jsChunks.length).toBeLessThanOrEqual(THRESHOLDS.maxJsChunks);

    const totalJsKb = Math.round(
      jsChunks.reduce((sum, r) => sum + r.size, 0) / 1024
    );
    test.info().annotations.push({ type: 'JS total', description: `${totalJsKb} KB` });
    expect(totalJsKb).toBeLessThanOrEqual(THRESHOLDS.maxJsBundleKb);

    // ── Verify no console errors ──
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('manifest')
    );
    expect(criticalErrors.length).toBe(THRESHOLDS.consoleErrors);

    // ── Measure TTFB via Navigation Timing API ──
    const ttfb = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return nav ? nav.responseStart - nav.requestStart : 0;
    });
    test.info().annotations.push({ type: 'TTFB', description: `${Math.round(ttfb)}ms` });
    if (ttfb > 0) {
      expect(ttfb).toBeLessThanOrEqual(THRESHOLDS.ttfbMaxMs);
    }

    // ── Measure LCP via PerformanceObserver ──
    const lcp = await lcpPromise;
    test.info().annotations.push({
      type: 'LCP',
      description: lcp > 0 ? `${Math.round(lcp)}ms` : 'no disponible',
    });
    if (lcp > 0) {
      expect(lcp).toBeLessThanOrEqual(THRESHOLDS.lcpMaxMs);
    }

    // ── Check CLS via PerformanceObserver ──
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value || 0;
              }
            }
          });
          observer.observe({ type: 'layout-shift', buffered: true });
        } catch {
          // CLS not supported
        }
        setTimeout(() => resolve(clsValue), 1000);
      });
    });
    test.info().annotations.push({ type: 'CLS', description: cls.toFixed(3) });
    expect(cls).toBeLessThanOrEqual(THRESHOLDS.clsMaxScore);

    // ── Check total request count ──
    test.info().annotations.push({
      type: 'Requests',
      description: `${totalRequests} total`,
    });
    expect(totalRequests).toBeLessThanOrEqual(THRESHOLDS.maxTotalRequests);
  });

  test('2. CTA y transición a onboarding es fluida', async ({ page }) => {
    const start = Date.now();

    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });

    await page.locator('#cta-btn').click();
    await page.waitForSelector('input', { timeout: 5000 });

    const transitionTime = Date.now() - start;
    test.info().annotations.push({
      type: 'CTA→Onboarding',
      description: `${transitionTime}ms`,
    });

    // The CTA has an 800ms deliberate delay, so total should be reasonable
    expect(transitionTime).toBeLessThan(5000);
  });

  test('3. No hay fugas de memoria después del onboarding completo', async ({ page }) => {
    // Use shared helper to complete onboarding
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await navigateOnboarding(page, 10);

    // navigateOnboarding with step=10 already clicks "Crear mi Digital Twin"
    // which finalizes onboarding. BootScreen auto-transitions to Home in ~4.5s.
    // Wait for boot sequence + home to render (greeting text)
    await page.waitForFunction(
      () => {
        const body = document.body.innerText;
        return body.includes('Buenos') || body.includes('Buenas');
      },
      { timeout: 20000 }
    );

    // Give a moment for lazy chunks to settle
    await page.waitForTimeout(1000);

    // Measure heap size
    const heapStats = await page.evaluate(() => {
      const perf = performance as any;
      if (perf.memory) {
        return {
          usedJSHeapSize: perf.memory.usedJSHeapSize,
          totalJSHeapSize: perf.memory.totalJSHeapSize,
        };
      }
      return null;
    });

    if (heapStats) {
      const usedMb = Math.round(heapStats.usedJSHeapSize / (1024 * 1024));
      const totalMb = Math.round(heapStats.totalJSHeapSize / (1024 * 1024));
      test.info().annotations.push({
        type: 'Heap (home)',
        description: `${usedMb} MB usado / ${totalMb} MB total`,
      });
      // Sanity check: heap should be reasonable for a SPA
      expect(usedMb).toBeLessThan(150);
    }
  });
});
