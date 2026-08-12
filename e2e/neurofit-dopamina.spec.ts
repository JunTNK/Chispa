/**
 * 💊 DOPAMINA — e2e flow
 *
 * Tests the Dopamina screen (dopamine menu/habit stacking):
 * - Navigation to screen
 * - Header and info box
 * - Dopamine menu categories (Aperitivo, Principal, Postre)
 * - Activity items with dopamine scores
 * - Habit stacking section
 * - Weekly review summary
 */
import { test, expect } from '@playwright/test';
import { completeOnboarding } from './helpers';

test.describe('Dopamina screen', () => {
  /** Helper: navigate to dopamina screen */
  async function goToDopamina(page: import('@playwright/test').Page) {
    await completeOnboarding(page, 20000);
    // Wait for navbar to be visible
    const nav = page.locator('nav[aria-label="Navegación principal"]');
    await nav.first().waitFor({ state: 'visible', timeout: 5000 });
    // Click "Más" button
    await nav.locator('button').filter({ hasText: 'Más' }).first().click();
    await page.waitForTimeout(300);
    // Click "Dopamina" in the menu
    await nav.locator('button').filter({ hasText: 'Dopamina' }).first().click();
    await page.waitForTimeout(500);
  }

  test('1. Dopamina screen loads with content', async ({ page }) => {
    await goToDopamina(page);

    // Verify screen has loaded with content
    // The screen should have dopamine menu items
    await expect(page.locator('text=Jumping jacks').first()).toBeVisible({ timeout: 10000 });
  });

  test('2. Aperitivo category shows quick activities', async ({ page }) => {
    await goToDopamina(page);

    // Aperitivo section
    await expect(page.locator('text=Aperitivo').first()).toBeVisible();

    // Quick activities
    const activities = ['Jumping jacks', 'Canción + baile', 'Agua fría en cara'];
    for (const act of activities) {
      await expect(page.locator('text=' + act).first()).toBeVisible();
    }
  });

  test('3. Principal category shows main workouts', async ({ page }) => {
    await goToDopamina(page);

    // Principal section
    await expect(page.locator('text=Principal').first()).toBeVisible();

    // Main workout options
    await expect(page.locator('text=Workout del día').first()).toBeVisible();
    await expect(page.locator('text=Caminar fuera').first()).toBeVisible();
  });

  test('4. Postre category shows recovery activities', async ({ page }) => {
    await goToDopamina(page);

    // Postre section
    await expect(page.locator('text=Postre').first()).toBeVisible();

    // Recovery activities
    const recovery = ['Estirar', 'Ducha caliente'];
    for (const act of recovery) {
      await expect(page.locator('text=' + act).first()).toBeVisible();
    }
  });

  test('5. Dopamine scores are displayed on activities', async ({ page }) => {
    await goToDopamina(page);

    // La pantalla carga datos async ("Cargando..."): espera auto-retry a que
    // el menú renderice antes de contar los scores (uno por actividad, 5-10).
    await expect(page.locator('text=Jumping jacks').first()).toBeVisible({ timeout: 15000 });
    const scoreElements = page.locator('text=/^[5-9]$|^10$/');
    await expect(scoreElements.first()).toBeVisible({ timeout: 15000 });
    const count = await scoreElements.count();
    expect(count).toBeGreaterThanOrEqual(5); // Multiple activities with scores
  });

  test('6. Habit stacking section is visible', async ({ page }) => {
    await goToDopamina(page);

    // Habit Stacking header
    await expect(page.locator('text=Habit Stacking')).toBeVisible();

    // Habit items with anchors
    const habits = ['Café de la mañana', 'Cepillarse los dientes', 'Cerrar el portátil'];
    for (const habit of habits) {
      await expect(page.locator('text=' + habit).first()).toBeVisible();
    }
  });

  test('7. Habit toggle buttons are interactive', async ({ page }) => {
    await goToDopamina(page);

    // Find a habit toggle button
    const toggleBtn = page.locator('button[aria-label*="Marcar"]').first();
    await expect(toggleBtn).toBeVisible();

    // Click to toggle
    const initialState = await toggleBtn.getAttribute('aria-label');
    await toggleBtn.click();
    await page.waitForTimeout(300);

    // Label should change
    const newState = await toggleBtn.getAttribute('aria-label');
    expect(newState).not.toBe(initialState);
  });

  test('8. Weekly review summary is displayed', async ({ page }) => {
    await goToDopamina(page);

    // Weekly Review header
    await expect(page.locator('text=Weekly Review')).toBeVisible();

    // Summary stats
    await expect(page.locator('text=Resumen de la semana')).toBeVisible();
    await expect(page.locator('text=sesiones').first()).toBeVisible();
    await expect(page.locator('text=minutos').first()).toBeVisible();
  });

  test('9. Weekly review shows motivational quote', async ({ page }) => {
    await goToDopamina(page);

    // Quote section with sessions count
    const quote = page.locator('text=/sesiones esta semana/');
    await expect(quote).toBeVisible();
  });
});
