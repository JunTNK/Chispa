import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Color-contrast e2e audit (dark + light + HC).
 * Falls if axe detects color-contrast (WCAG AA) violations on key screens.
 */

/** Sets theme in localStorage, reloads, and ensures body class is applied. */
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
  if (theme === 'light' || theme === 'hc') {
    await applyThemeClass(page, theme);
  }
  await page.waitForTimeout(500);
}

/** Applies theme class directly to body.
 *  Also injects a MutationObserver that re-applies the class if useEffect removes it. */
async function applyThemeClass(page: import('@playwright/test').Page, theme: string) {
  if (theme === 'dark') return;
  const cls = theme === 'light' ? 'light' : 'hc';
  await page.evaluate((c) => {
    document.body.classList.remove('light', 'hc');
    document.body.classList.add(c);
    // Inject a MutationObserver to re-apply the class if useEffect removes it
    if (!(window as any).__chispaThemeObserver) {
      const observer = new MutationObserver(() => {
        if (!document.body.classList.contains(c)) {
          document.body.classList.add(c);
        }
      });
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      (window as any).__chispaThemeObserver = observer;
    }
  }, cls);
}



/** Navigates to a view by setting localStorage and reloading. */
async function navigateToView(
  page: import('@playwright/test').Page,
  view: string,
  theme?: string,
) {
  await page.evaluate((v) => {
    const store = JSON.parse(localStorage.getItem('chispa_store') || '{}');
    store.state = store.state || {};
    store.state.view = v;
    localStorage.setItem('chispa_store', JSON.stringify(store));
  }, view);
  await page.reload({ waitUntil: 'networkidle' });
  if (theme && theme !== 'dark') {
    await applyThemeClass(page, theme);
    await page.waitForTimeout(500);
    // Re-apply in case useEffect removed it
    await applyThemeClass(page, theme);
  }
}

/** Runs axe and throws if color-contrast violations are found.
 *  Applies theme class right before axe to prevent useEffect race. */
async function assertNoContrastViolations(
  page: import('@playwright/test').Page,
  label: string,
  theme?: string,
) {
  // Re-apply theme class RIGHT before axe to avoid useEffect race condition
  if (theme && theme !== 'dark') {
    await applyThemeClass(page, theme);
    await page.waitForTimeout(100);
  }

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2aa', 'wcag21aa'])
    .analyze();

  const colorViolations = results.violations.filter((v) => v.id === 'color-contrast');

  if (colorViolations.length > 0) {
    const details = colorViolations
      .map(
        (v) =>
          `  • ${v.id} (impact: ${v.impact}) — ${v.nodes.length} nodos: ${v.description}\n` +
          v.nodes.map((n) => `    ${n.target.join(' > ')}`).join('\n'),
      )
      .join('\n\n');
    throw new Error(`${label} — ${colorViolations.length} violaciones de color-contrast:\n${details}`);
  }
}

// ═══════════════════════════════════════════════════════════════
//  DARK THEME
// ═══════════════════════════════════════════════════════════════

test.describe('Color-contrast · dark', () => {
  test('landing · no color-contrast violations (WCAG AA)', async ({ page }) => {
    await setTheme(page, 'dark');
    await assertNoContrastViolations(page, 'landing [dark]');
  });

  test('home · no color-contrast violations (WCAG AA)', async ({ page }) => {
    await setTheme(page, 'dark');
    await navigateToView(page, 'home');
    await assertNoContrastViolations(page, 'home [dark]');
  });

  test('profile · no color-contrast violations (WCAG AA)', async ({ page }) => {
    await setTheme(page, 'dark');
    await navigateToView(page, 'profile');
    await assertNoContrastViolations(page, 'profile [dark]');
  });

  test('session · no color-contrast violations (WCAG AA)', async ({ page }) => {
    await setTheme(page, 'dark');
    await navigateToView(page, 'session');
    await assertNoContrastViolations(page, 'session [dark]');
  });
});

// ═══════════════════════════════════════════════════════════════
//  LIGHT THEME
// ═══════════════════════════════════════════════════════════════

test.describe('Color-contrast · light', () => {
  test('landing · no color-contrast violations (WCAG AA)', async ({ page }) => {
    await setTheme(page, 'light');
    await assertNoContrastViolations(page, 'landing [light]', 'light');
  });

  test('home · no color-contrast violations (WCAG AA)', async ({ page }) => {
    await setTheme(page, 'light');
    await navigateToView(page, 'home', 'light');
    await assertNoContrastViolations(page, 'home [light]', 'light');
  });

  test('profile · no color-contrast violations (WCAG AA)', async ({ page }) => {
    await setTheme(page, 'light');
    await navigateToView(page, 'profile', 'light');
    await assertNoContrastViolations(page, 'profile [light]', 'light');
  });

  test('session · no color-contrast violations (WCAG AA)', async ({ page }) => {
    await setTheme(page, 'light');
    await navigateToView(page, 'session', 'light');
    await assertNoContrastViolations(page, 'session [light]', 'light');
  });
});

// ═══════════════════════════════════════════════════════════════
//  HIGH CONTRAST THEME
// ═══════════════════════════════════════════════════════════════

test.describe('Color-contrast · hc', () => {
  test('landing · no color-contrast violations (WCAG AA)', async ({ page }) => {
    await setTheme(page, 'hc');
    await assertNoContrastViolations(page, 'landing [hc]', 'hc');
  });

  test('home · no color-contrast violations (WCAG AA)', async ({ page }) => {
    await setTheme(page, 'hc');
    await navigateToView(page, 'home', 'hc');
    await assertNoContrastViolations(page, 'home [hc]', 'hc');
  });

  test('profile · no color-contrast violations (WCAG AA)', async ({ page }) => {
    await setTheme(page, 'hc');
    await navigateToView(page, 'profile', 'hc');
    await assertNoContrastViolations(page, 'profile [hc]', 'hc');
  });

  test('session · no color-contrast violations (WCAG AA)', async ({ page }) => {
    await setTheme(page, 'hc');
    await navigateToView(page, 'session', 'hc');
    await assertNoContrastViolations(page, 'session [hc]', 'hc');
  });
});
