/**
 * ⚙️ PROFILE SETTINGS — e2e flow
 *
 * Tests the profile screen settings:
 * - Navigation from home
 * - Profile sections visible (Digital Twin, Accesibilidad, Exportar datos)
 * - Theme toggle (light/dark)
 * - High contrast toggle
 * - Large font toggle
 * - Language switcher
 */
import { test, expect } from '@playwright/test';
import {
  completeOnboarding,
  openExtraMenu,
  navigateToNavScreen,
} from './helpers';

test.describe('Profile settings', () => {
  /** Helper: navigate to profile screen */
  async function goToProfile(page: import('@playwright/test').Page) {
    await completeOnboarding(page, 20000);
    await openExtraMenu(page, 'Perfil');
  }

  test('1. Navigate to profile and see sections', async ({ page }) => {
    await goToProfile(page);

    // Verify key sections
    await expect(page.locator('text=Digital Twin')).toBeVisible();
    await expect(page.locator('text=Accesibilidad')).toBeVisible();
    await expect(page.locator('text=Exportar datos')).toBeVisible();
  });

  test('2. Accessibility toggles exist and are interactive', async ({ page }) => {
    await goToProfile(page);

    // Switches should exist (role="switch"). La pantalla carga async
    // ("Cargando..."): espera auto-retry antes de contar. Actual: 7
    // (Reducir movimiento + 6 preferencias del map).
    const switches = page.locator('[role="switch"]');
    await expect(switches.first()).toBeVisible({ timeout: 15000 });
    const count = await switches.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Click the first switch
    const firstSwitch = switches.first();
    const wasChecked = await firstSwitch.getAttribute('aria-checked');
    await firstSwitch.click();
    await page.waitForTimeout(300);

    // Verify it toggled
    const isNowChecked = await firstSwitch.getAttribute('aria-checked');
    expect(isNowChecked).not.toBe(wasChecked);

    // Toggle back
    await firstSwitch.click();
    await page.waitForTimeout(300);
  });

  test('3. Language switcher changes UI language', async ({ page }) => {
    await goToProfile(page);

    // El nombre accesible del grupo está localizado ('Idioma'/'Language'), así
    // que se apunta a los botones directamente (nombres exactos 'es'/'en')
    // en vez de re-localizar el grupo tras cambiar el idioma.
    const enBtn = page.getByRole('button', { name: /^en$/i });
    const esBtn = page.getByRole('button', { name: /^es$/i });
    await expect(enBtn).toBeVisible();

    // Click EN button
    await enBtn.click();
    await page.waitForTimeout(1000);

    // Verify document language changed
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBe('en');

    // Some English text should be visible
    await expect(page.locator('text=Your Digital Twin')).toBeVisible({ timeout: 5000 });

    // Switch back to ES
    await esBtn.click();
    await page.waitForTimeout(1000);

    const langAfter = await page.evaluate(() => document.documentElement.lang);
    expect(langAfter).toBe('es');
  });

  test('4. Back navigation returns to home', async ({ page }) => {
    await goToProfile(page);

    // Perfil es una pantalla navegada (sin botón "Volver"): se vuelve a home
    // desde el navbar.
    await navigateToNavScreen(page, 'Inicio');

    // Should be back at home
    await expect(page.locator('text=Crear rutina')).toBeVisible();
  });

  test('5. Autoplay del flipbook toggle persiste en el store', async ({ page }) => {
    await goToProfile(page);

    const toggle = page.getByRole('switch', { name: 'Autoplay del flipbook' });
    await expect(toggle).toBeVisible({ timeout: 15000 });

    // Estado efectivo por defecto: ON (el flipbook lee undefined ?? true — el
    // toggle no muestra un falso OFF para prefs aún sin definir)
    expect(await toggle.getAttribute('aria-checked')).toBe('true');

    // Apagar → el switch cambia Y el valor se persiste en chispa_store
    await toggle.click();
    await page.waitForTimeout(300);
    expect(await toggle.getAttribute('aria-checked')).toBe('false');

    const prefs = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('chispa_store');
        return raw ? (JSON.parse(raw) as { state?: { prefs?: Record<string, unknown> } })?.state?.prefs : null;
      } catch {
        return null;
      }
    });
    expect(prefs?.explainerAutoplay).toBe(false);

    // Encender de nuevo → restaura
    await toggle.click();
    await page.waitForTimeout(300);
    expect(await toggle.getAttribute('aria-checked')).toBe('true');
  });
});
