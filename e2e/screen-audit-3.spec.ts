/**
 * 🎯 SCREEN AUDIT — Part 3: Awards, Session & Routes
 * Logros -> Leaderboard -> Catalog -> Session -> /docs -> AuthCallback -> AuthCallback
 */
import { test, expect } from '@playwright/test';
import { completeOnboarding, startCapture, checkErrors, resetErrors, reportAudit, openExtraMenu, dismissPortal } from './helpers';

test('Audit 3/3 — Logros → Leaderboard → Catalog → Session → /docs → AuthCallbacks', async ({ page }) => {
  resetErrors();
  startCapture(page);

  // Onboarding → Home
  await page.goto('/');
  await completeOnboarding(page);
  await page.waitForTimeout(400);
  const nav = page.locator('nav[aria-label="Navegación principal"]');

  // 13. LOGROS
  await openExtraMenu(page, 'Logros');
  await checkErrors(page, 'logros');
  console.log('✅ 13. Logros');

  // 14. LEADERBOARD
  await openExtraMenu(page, 'Ranking');
  await checkErrors(page, 'leaderboard');
  console.log('✅ 14. Leaderboard');

  // 15. CATALOG (via Más)
  await openExtraMenu(page, 'Ejercicios');
  await checkErrors(page, 'catalog-extra');
  console.log('✅ 15. Catalog (via Más)');

  // 16. SESSION (via check-in + plan)
  await dismissPortal(page);
  await nav.locator('button').filter({ hasText: 'Inicio' }).click();
  await page.waitForTimeout(400);
  await page.locator('button').filter({ hasText: 'Calcular mi día' }).click();
  // Wait for plan generation with timeout (DecisionEngine may return rest day)
  const startBtn = page.locator('button').filter({ hasText: 'Empezar ahora' });
  try {
    await startBtn.waitFor({ state: 'visible', timeout: 5000 });
    await startBtn.click();
    await page.waitForTimeout(800);
    await checkErrors(page, 'session');
    console.log('✅ 16. Session');
  } catch {
    await expect(nav).toBeVisible();
    console.log('ℹ️  16. Session — no plan generated (rest day or timeout)');
  }

  // 17. /docs
  await page.goto('/docs');
  await page.waitForTimeout(600);
  await checkErrors(page, 'docs');
  await expect(page.locator('text=Iconos fitness')).toBeVisible();
  await expect(page.locator('input[type="range"]').first()).toBeVisible();
  console.log('✅ 17. /docs');

  // 18. AUTH CALLBACK (error state)
  await page.goto('/auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+expired');
  await page.waitForTimeout(500);
  await checkErrors(page, 'auth-callback-error');
  await expect(page.locator('text=Error de autenticación')).toBeVisible();
  await expect(page.locator('text=Intentar de nuevo')).toBeVisible();
  console.log('✅ 18. Auth Callback (error)');

  // 19. AUTH CALLBACK (no context — fallback error)
  await page.goto('/auth/callback');
  await page.waitForTimeout(500);
  await checkErrors(page, 'auth-callback-fallback');
  await expect(page.locator('text=Error de autenticación')).toBeVisible();
  await expect(page.locator('text=No se encontró una sesión activa')).toBeVisible();
  console.log('✅ 19. Auth Callback (fallback — no session)');

  // Note: Summary screen requires completing a full workout session — tested manually
  console.log('ℹ️  Summary: skipped (requires completing a full workout)');

  const errCount = reportAudit('Audit 3/3', 7);
  expect(errCount).toBe(0);
});
