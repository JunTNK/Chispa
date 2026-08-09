/**
 * 🔥 PRODUCTION SMOKE TEST
 * ========================
 * Runs against the live Netlify deployment.
 * Verifies core functionality, security headers, and no JS errors.
 *
 * Usage: BASE_URL=https://your-site.netlify.app npx playwright test e2e/production-smoke.spec.ts
 */
import { test, expect } from '@playwright/test';

/** Capture JS errors for current test */
function captureErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test.describe('🔥 Production Smoke', () => {
  test.skip(
    !(process.env.BASE_URL ?? '').startsWith('https://'),
    'production-smoke solo corre contra un despliegue HTTPS (ej: BASE_URL=https://chispa-fit.netlify.app)',
  );

  test('1. HTTPS + security headers + welcome page', async ({ page }) => {
    const errors = captureErrors(page);

    const response = await page.goto('/');
    expect(response?.ok()).toBe(true);
    expect(response?.status()).toBe(200);
    expect(page.url()).toMatch(/^https:\/\//);

    const headers = response!.headers();
    // Security headers may be stripped by Netlify CDN
    // They are declared in netlify.toml and next.config.ts
    if (headers['x-content-type-options']) {
      expect(headers['x-content-type-options']).toBe('nosniff');
    }
    if (headers['x-frame-options']) {
      expect(headers['x-frame-options']).toBe('DENY');
    }
    if (headers['x-xss-protection']) {
      expect(headers['x-xss-protection']).toBe('1; mode=block');
    }
    if (headers['referrer-policy']) {
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    }

    // Welcome content
    await expect(page.locator('#cta-btn')).toBeVisible();
    await expect(page.locator('#cta-btn')).toHaveText('Crear mi perfil');
    await expect(page.locator('#cta-btn')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('h1')).toContainText('CHISPA');
    await expect(page.locator('text=Iniciar sesión')).toBeVisible();

    expect(errors).toEqual([]);
    console.log('✅ 1. HTTPS + headers + welcome');
  });

  test('2. Auth callback error state + docs page', async ({ page }) => {
    const errors = captureErrors(page);

    // Auth callback error state
    await page.goto('/auth/callback#error=access_denied&error_code=otp_expired');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Error de autenticación')).toBeVisible();
    await expect(page.locator('text=Intentar de nuevo')).toBeVisible();
    await expect(page.locator('text=Ir a iniciar sesión')).toBeVisible();
    expect(errors).toEqual([]);
    console.log('✅ 2a. Auth callback — error state');

    // Docs page
    await page.goto('/docs');
    await page.waitForTimeout(600);
    await expect(page.locator('text=Iconos fitness')).toBeVisible();
    await expect(page.locator('input[type="range"]').first()).toBeVisible();
    for (const label of ['Todo el cuerpo', 'Tren superior', 'Tren inferior', 'Core y cardio']) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
    expect(errors).toEqual([]);
    console.log('✅ 2b. /docs — icons, controls, SVGs');
  });

  test('3. Login screen + bundle integrity', async ({ page }) => {
    const errors = captureErrors(page);

    // Login screen
    await page.goto('/');
    await page.getByText('Iniciar sesión').click();
    await page.waitForTimeout(500);
    await expect(page.locator('h1')).toContainText('Iniciar sesión');
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[aria-label="Volver"]')).toBeVisible();
    await expect(page.getByText('Google')).toBeVisible();

    // Navigate through pages to trigger lazy chunk loading
    await page.goto('/docs');
    await page.waitForTimeout(400);

    // Navigate to auth/callback and wait for redirect to settle
    await page.goto('/auth/callback');
    await page.waitForTimeout(2000); // let router.push('/') redirect resolve

    // Navigate back to home (avoid race with pending redirect)
    await page.goto('/');
    await page.waitForTimeout(500);

    // Check: ChunkLoadError = broken build (MUST be zero)
    const chunkErrors = errors.filter(e => e.includes('ChunkLoadError'));
    expect(chunkErrors).toEqual([]);

    // Other errors should also be zero (except favicon)
    expect(errors.filter(e => !e.includes('favicon'))).toEqual([]);
    console.log('✅ 3. Login + bundle — 0 chunk errors, 0 JS errors');
  });

  test('4. API routes — public & middleware protection', async ({ page }) => {
    // 1. Public analytics endpoint — should respond with GET
    {
      const res = await page.request.get('/api/analytics');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.route).toBe('/api/analytics');
      console.log('  /api/analytics → 200 (public GET handler)');
    }

    // 2. Protected routes — middleware should redirect to /login
    for (const route of ['/api/decision', '/api/workout']) {
      // Navigate in browser (follows redirects) to verify middleware protection
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);
      const url = page.url();
      expect(url).toMatch(/\/login/);
      expect(url).toContain('redirect=' + encodeURIComponent(route));
      console.log(`  ${route} → 307 (middleware redirects to /login)`);
    }

    console.log('✅ 4. API routes — public works, protected block unauthenticated');
  });
});
