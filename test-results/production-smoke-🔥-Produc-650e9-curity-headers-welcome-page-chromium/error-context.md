# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: production-smoke.spec.ts >> 🔥 Production Smoke >> 1. HTTPS + security headers + welcome page
- Location: e2e/production-smoke.spec.ts:20:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#cta-btn')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('#cta-btn')

```

```yaml
- heading "Loading ..." [level=3]
```

# Test source

```ts
  1   | /**
  2   |  * 🔥 PRODUCTION SMOKE TEST
  3   |  * ========================
  4   |  * Runs against the live Netlify deployment.
  5   |  * Verifies core functionality, security headers, and no JS errors.
  6   |  *
  7   |  * Usage: BASE_URL=https://your-site.netlify.app npx playwright test e2e/production-smoke.spec.ts
  8   |  */
  9   | import { test, expect } from '@playwright/test';
  10  | 
  11  | /** Capture JS errors for current test */
  12  | function captureErrors(page: import('@playwright/test').Page): string[] {
  13  |   const errors: string[] = [];
  14  |   page.on('pageerror', (err) => errors.push(err.message));
  15  |   return errors;
  16  | }
  17  | 
  18  | test.describe('🔥 Production Smoke', () => {
  19  | 
  20  |   test('1. HTTPS + security headers + welcome page', async ({ page }) => {
  21  |     const errors = captureErrors(page);
  22  | 
  23  |     const response = await page.goto('/');
  24  |     expect(response?.ok()).toBe(true);
  25  |     expect(response?.status()).toBe(200);
  26  |     expect(page.url()).toMatch(/^https:\/\//);
  27  | 
  28  |     const headers = response!.headers();
  29  |     // Security headers may be stripped by Netlify CDN
  30  |     // They are declared in netlify.toml and next.config.ts
  31  |     if (headers['x-content-type-options']) {
  32  |       expect(headers['x-content-type-options']).toBe('nosniff');
  33  |     }
  34  |     if (headers['x-frame-options']) {
  35  |       expect(headers['x-frame-options']).toBe('DENY');
  36  |     }
  37  |     if (headers['x-xss-protection']) {
  38  |       expect(headers['x-xss-protection']).toBe('1; mode=block');
  39  |     }
  40  |     if (headers['referrer-policy']) {
  41  |       expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  42  |     }
  43  | 
  44  |     // Welcome content
> 45  |     await expect(page.locator('#cta-btn')).toBeVisible();
      |                                            ^ Error: expect(locator).toBeVisible() failed
  46  |     await expect(page.locator('#cta-btn')).toHaveText('Crear mi perfil');
  47  |     await expect(page.locator('#cta-btn')).toHaveAttribute('aria-busy', 'false');
  48  |     await expect(page.locator('h1')).toContainText('CHISPA');
  49  |     await expect(page.locator('text=Iniciar sesión')).toBeVisible();
  50  | 
  51  |     expect(errors).toEqual([]);
  52  |     console.log('✅ 1. HTTPS + headers + welcome');
  53  |   });
  54  | 
  55  |   test('2. Auth callback error state + docs page', async ({ page }) => {
  56  |     const errors = captureErrors(page);
  57  | 
  58  |     // Auth callback error state
  59  |     await page.goto('/auth/callback#error=access_denied&error_code=otp_expired');
  60  |     await page.waitForTimeout(500);
  61  |     await expect(page.locator('text=Error de autenticación')).toBeVisible();
  62  |     await expect(page.locator('text=Intentar de nuevo')).toBeVisible();
  63  |     await expect(page.locator('text=Ir a iniciar sesión')).toBeVisible();
  64  |     expect(errors).toEqual([]);
  65  |     console.log('✅ 2a. Auth callback — error state');
  66  | 
  67  |     // Docs page
  68  |     await page.goto('/docs');
  69  |     await page.waitForTimeout(600);
  70  |     await expect(page.locator('text=Iconos fitness')).toBeVisible();
  71  |     await expect(page.locator('input[type="range"]').first()).toBeVisible();
  72  |     for (const label of ['Todo el cuerpo', 'Tren superior', 'Tren inferior', 'Core y cardio']) {
  73  |       await expect(page.getByText(label).first()).toBeVisible();
  74  |     }
  75  |     expect(errors).toEqual([]);
  76  |     console.log('✅ 2b. /docs — icons, controls, SVGs');
  77  |   });
  78  | 
  79  |   test('3. Login screen + bundle integrity', async ({ page }) => {
  80  |     const errors = captureErrors(page);
  81  | 
  82  |     // Login screen
  83  |     await page.goto('/');
  84  |     await page.getByText('Iniciar sesión').click();
  85  |     await page.waitForTimeout(500);
  86  |     await expect(page.locator('h1')).toContainText('Iniciar sesión');
  87  |     await expect(page.locator('input[type="email"]').first()).toBeVisible();
  88  |     await expect(page.locator('input[type="password"]').first()).toBeVisible();
  89  |     await expect(page.locator('button[aria-label="Volver"]')).toBeVisible();
  90  |     await expect(page.getByText('Google')).toBeVisible();
  91  | 
  92  |     // Navigate through pages to trigger lazy chunk loading
  93  |     await page.goto('/docs');
  94  |     await page.waitForTimeout(400);
  95  | 
  96  |     // Navigate to auth/callback and wait for redirect to settle
  97  |     await page.goto('/auth/callback');
  98  |     await page.waitForTimeout(2000); // let router.push('/') redirect resolve
  99  | 
  100 |     // Navigate back to home (avoid race with pending redirect)
  101 |     await page.goto('/');
  102 |     await page.waitForTimeout(500);
  103 | 
  104 |     // Check: ChunkLoadError = broken build (MUST be zero)
  105 |     const chunkErrors = errors.filter(e => e.includes('ChunkLoadError'));
  106 |     expect(chunkErrors).toEqual([]);
  107 | 
  108 |     // Other errors should also be zero (except favicon)
  109 |     expect(errors.filter(e => !e.includes('favicon'))).toEqual([]);
  110 |     console.log('✅ 3. Login + bundle — 0 chunk errors, 0 JS errors');
  111 |   });
  112 | 
  113 |   test('4. API routes respond', async ({ page }) => {
  114 |     const results = await Promise.allSettled([
  115 |       page.request.get('/api/analytics'),
  116 |       page.request.get('/api/decision'),
  117 |       page.request.get('/api/workout'),
  118 |     ]);
  119 | 
  120 |     const fulfilled = results.filter(r => r.status === 'fulfilled');
  121 |     console.log(`  APIs responded: ${fulfilled.length}/3`);
  122 |     for (const [i, route] of ['/api/analytics', '/api/decision', '/api/workout'].entries()) {
  123 |       const r = results[i];
  124 |       if (r.status === 'fulfilled') {
  125 |         expect(r.value.status()).not.toBe(404);
  126 |         console.log(`  ${route} → ${r.value.status()}`);
  127 |       } else {
  128 |         console.log(`  ${route} → unreachable (expected offline-first, no Supabase)`);
  129 |       }
  130 |     }
  131 |     console.log('✅ 4. API routes — checked');
  132 |   });
  133 | });
  134 | 
```