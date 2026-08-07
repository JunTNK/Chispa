import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Color-contrast e2e audit (dark + light + HC).
 * Falla si axe detecta violaciones de color-contrast (WCAG AA) en pantallas clave.
 */
const screens = [
  { name: 'landing', path: '/', view: 'welcome' },
  { name: 'home', path: '/', view: 'home' },
  { name: 'profile', path: '/', view: 'profile' },
  { name: 'session', path: '/', view: 'session' },
];

// Helper: fuerza un theme en localStorage y recarga
// Usa setInterval para esperar a que el store se inicialice antes de recargar
async function setTheme(page: import('@playwright/test').Page, theme: 'dark' | 'light' | 'hc') {
  await page.goto('/');
  await page.waitForTimeout(500);
  await page.evaluate((t) => {
    const raw = localStorage.getItem('chispa_store') || '{}';
    const stored = JSON.parse(raw);
    stored.state = stored.state || {};
    stored.state.prefs = { light: false, highContrast: false, ...(stored.state.prefs || {}) };
    if (t === 'light') stored.state.prefs.light = true;
    if (t === 'hc') stored.state.prefs.highContrast = true;
    localStorage.setItem('chispa_store', JSON.stringify(stored));
  }, theme);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
}

for (const theme of ['dark', 'light', 'hc'] as const) {
  test.describe(`Color-contrast · ${theme}`, () => {
    for (const screen of screens) {
      test(`${screen.name} · no color-contrast violations (WCAG AA)`, async ({ page }) => {
        await setTheme(page, theme);
        await page.goto('/');
        // Fuerza el view correspondiente (simula navegación interna)
        if (screen.view !== 'welcome') {
          await page.evaluate((v) => {
            const store = JSON.parse(localStorage.getItem('chispa_store') || '{}');
            store.state = store.state || {};
            store.state.view = v;
            localStorage.setItem('chispa_store', JSON.stringify(store));
            window.location.reload();
          }, screen.view);
          await page.waitForLoadState('networkidle');
        }

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2aa', 'wcag21aa'])
          .analyze();

        const colorViolations = results.violations.filter((v) =>
          v.id === 'color-contrast'
        );

        if (colorViolations.length > 0) {
          const details = colorViolations.map((v) =>
            `  • ${v.id} (impact: ${v.impact}) — ${v.nodes.length} nodos: ${v.description}\n` +
            v.nodes.map((n) => `    ${n.target.join(' > ')}`).join('\n')
          ).join('\n\n');
          throw new Error(`${screen.name} [${theme}] — ${colorViolations.length} violaciones de color-contrast:\n${details}`);
        }
      });
    }
  });
}