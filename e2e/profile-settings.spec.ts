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
  goBack,
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

    // Switches should exist (role="switch")
    const switches = page.locator('[role="switch"]');
    const count = await switches.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Click the first switch (high contrast)
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

    // Find language group
    const langGroup = page.getByRole('group', { name: 'Idioma' });
    await expect(langGroup).toBeVisible();

    // Click EN button
    const enBtn = langGroup.getByRole('button', { name: /^en$/i });
    await enBtn.click();
    await page.waitForTimeout(1000);

    // Verify document language changed
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBe('en');

    // Some English text should be visible
    await expect(page.locator('text=Your Digital Twin')).toBeVisible({ timeout: 5000 });

    // Switch back to ES
    const esBtn = langGroup.getByRole('button', { name: /^es$/i });
    await esBtn.click();
    await page.waitForTimeout(1000);

    const langAfter = await page.evaluate(() => document.documentElement.lang);
    expect(langAfter).toBe('es');
  });

  test('4. Back navigation returns to home', async ({ page }) => {
    await goToProfile(page);

    await goBack(page);

    // Should be back at home
    await expect(page.locator('text=Crear rutina')).toBeVisible();
  });
});
