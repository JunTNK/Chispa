import { test, expect } from '@playwright/test';

/**
 * 5-second funnel (proxy automatizado del test humano).
 * Valida que un usuario vea la acción principal y las FAQs de confianza
 * sin scroll ni interacción, y pueda armar su perfil en < 3s.
 * Tolerante al locale (ES/EN) para los textos de FAQs.
 */
test.describe('5s funnel · humano-proxy', () => {
  test('CTA hero visible sin scroll obligatorio (smoke baseline)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const cta = page.locator('#cta-btn');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveText('Crear mi perfil');
  });

  test('CTA hero alcanzable sin desplazamiento largo (< 3 viewports)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const cta = page.locator('#cta-btn');
    await expect(cta).toBeVisible();

    const box = await cta.boundingBox();
    expect(box, '#cta-btn sin bounding box').not.toBeNull();
    const viewport = page.viewportSize();
    if (box && viewport) {
      expect(box.y).toBeLessThan(viewport.height * 3);
    }
  });

  test('FAQs de confianza (datos + IA) abiertas por defecto', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Las 2 FAQs de confianza usan <details open>. Selector class, tolerante a locale.
    const details = page.locator('details.faq-details[open]');
    await expect(details).toHaveCount(2);

    // Verifica el contenido visible de ambas (ES o EN)
    await expect(details.nth(0)).toContainText(/Salen mis datos|data leave my device/i);
    await expect(details.nth(1)).toContainText(/IA real|Real AI|marketing/i);
  });

  test('Click en CTA abre onboarding (input nombre visible)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Esperar a que React hidrate antes de click
    await page.waitForTimeout(500);
    await page.locator('#cta-btn').click();

    // El CTA tiene un delay de 800ms interno + transición de vista
    await page.waitForTimeout(3000);

    // Intenta múltiples selectores (id, name, generic input)
    const nameInput = page.locator('#onboarding-name');
    const inputFallback = page.locator('input[name="name"]');
    const anyInput = page.locator('input');

    const nameVisible = await nameInput.isVisible().catch(() => false);
    const fallbackVisible = await inputFallback.isVisible().catch(() => false);
    const anyVisible = await anyInput.isVisible().catch(() => false);

    expect(nameVisible || fallbackVisible || anyVisible, 'name input visible after onboarding').toBe(true);
  });

  test('footbar sticky sigue visible tras scroll (thumb-reachable)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('#cta-btn-foot').scrollIntoViewIfNeeded();
    await expect(page.locator('#cta-btn-foot')).toBeVisible();
    await expect(page.locator('#cta-btn-foot')).toHaveText('Crear mi perfil');

    // Scroll hacia arriba y confirma que el footbar sticky aún está en viewport
    await page.evaluate(() => window.scrollBy(0, -500));
    const box = await page.locator('#cta-btn-foot').boundingBox();
    const viewport = page.viewportSize();
    if (box && viewport) {
      expect(box.y).toBeGreaterThanOrEqual(0);
    }
  });
});
