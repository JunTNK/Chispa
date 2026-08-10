/**
 * ⚡ QUICK LOG — e2e flow
 *
 * Tests the quick log wizard:
 * - Navigation from home
 * - Duration selection step
 * - Exercise selection step
 * - RPE + mood selection step
 * - Save and confirmation
 * - Back navigation between steps
 */
import { test, expect } from '@playwright/test';
import {
  completeOnboarding,
  navigateFromHome,
  goBack,
} from './helpers';

test.describe('Quick log flow', () => {
  /** Helper: navigate to quick log screen */
  async function goToQuickLog(page: import('@playwright/test').Page) {
    await completeOnboarding(page, 20000);
    await navigateFromHome(page, 'Registro rápido');
  }

  test('1. Navigate to quick log from home', async ({ page }) => {
    await goToQuickLog(page);

    // Verify header
    await expect(page.locator('text=Registro rápido')).toBeVisible();
    await expect(page.locator('text=Registra tu movimiento')).toBeVisible();

    // Duration step should be visible
    await expect(page.locator('text=¿Cuánto duró?')).toBeVisible();
  });

  test('2. Duration presets are selectable', async ({ page }) => {
    await goToQuickLog(page);

    // Duration buttons should be visible (1, 5, 10, 15, 20, 30, 45, 60)
    const durations = [1, 5, 10, 15, 20, 30, 45, 60];
    for (const d of durations) {
      await expect(page.locator('button').filter({ hasText: new RegExp(`^${d}$`) }).first()).toBeVisible();
    }

    // 20 should be selected by default
    const btn20 = page.locator('button').filter({ hasText: /^20$/ }).first();
    await expect(btn20).toHaveClass(/#ffb454/);

    // Click 30 min
    await page.locator('button').filter({ hasText: /^30$/ }).first().click();
    await page.waitForTimeout(200);

    // Click Siguiente
    await page.locator('button').filter({ hasText: 'Siguiente' }).click();
    await page.waitForTimeout(500);

    // Should be on exercises step
    await expect(page.locator('text=¿Qué hiciste?')).toBeVisible();
  });

  test('3. Exercise selection and custom exercise', async ({ page }) => {
    await goToQuickLog(page);

    // Go to exercises step
    await page.locator('button').filter({ hasText: 'Siguiente' }).click();
    await page.waitForTimeout(500);

    // Verify exercises step
    await expect(page.locator('text=¿Qué hiciste?')).toBeVisible();

    // Add a custom exercise
    const customInput = page.locator('#quicklog-custom-ex');
    await customInput.fill('Sentadillas libre');
    await customInput.press('Enter');
    await page.waitForTimeout(300);

    // Should show in selected exercises
    await expect(page.locator('text=Sentadillas libre')).toBeVisible();

    // Continue to RPE
    await page.locator('button').filter({ hasText: /Siguiente|Continuar sin detalles/ }).first().click();
    await page.waitForTimeout(500);

    // RPE step
    await expect(page.locator('text=¿Qué tal el esfuerzo?')).toBeVisible();
  });

  test('4. RPE and mood selection', async ({ page }) => {
    await goToQuickLog(page);

    // Navigate to RPE step
    await page.locator('button').filter({ hasText: 'Siguiente' }).click();
    await page.waitForTimeout(500);
    await page.locator('button').filter({ hasText: /Siguiente|Continuar sin detalles/ }).first().click();
    await page.waitForTimeout(500);

    // RPE options visible
    await expect(page.locator('text=¿Qué tal el esfuerzo?')).toBeVisible();
    await expect(page.locator('text=Suave')).toBeVisible();
    await expect(page.locator('text=Justo')).toBeVisible();
    await expect(page.locator('text=Duro')).toBeVisible();

    // Select RPE
    await page.locator('button').filter({ hasText: 'Justo' }).click();
    await page.waitForTimeout(200);

    // Mood options visible
    await expect(page.locator('text=¿Cómo te sientes ahora?')).toBeVisible();
    await expect(page.locator('text=Tranquilo')).toBeVisible();
    await expect(page.locator('text=Feliz')).toBeVisible();

    // Select mood
    await page.locator('button').filter({ hasText: 'Feliz' }).click();
    await page.waitForTimeout(200);

    // Save button visible
    await expect(page.locator('button').filter({ hasText: '¡Listo! Guardar' })).toBeVisible();
  });

  test('5. Complete quick log and see confirmation', async ({ page }) => {
    await goToQuickLog(page);

    // Duration → Exercises → RPE → Save
    await page.locator('button').filter({ hasText: 'Siguiente' }).click();
    await page.waitForTimeout(500);
    await page.locator('button').filter({ hasText: /Siguiente|Continuar sin detalles/ }).first().click();
    await page.waitForTimeout(500);
    await page.locator('button').filter({ hasText: 'Duro' }).click();
    await page.waitForTimeout(200);
    await page.locator('button').filter({ hasText: '¡Listo! Guardar' }).click();
    await page.waitForTimeout(500);

    // Confirmation screen
    await expect(page.locator('text=¡Registrado!')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Ir al inicio')).toBeVisible();
    await expect(page.locator('text=Otro registro')).toBeVisible();
  });

  test('6. Back button navigates between steps', async ({ page }) => {
    await goToQuickLog(page);

    // Go to exercises
    await page.locator('button').filter({ hasText: 'Siguiente' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=¿Qué hiciste?')).toBeVisible();

    // Go back to duration
    await goBack(page);
    await expect(page.locator('text=¿Cuánto duró?')).toBeVisible();

    // Go back to home
    await goBack(page);
    await expect(page.locator('text=Crear rutina')).toBeVisible();
  });

  test('7. Cancel returns to home', async ({ page }) => {
    await goToQuickLog(page);

    // Click Cancelar
    await page.locator('button').filter({ hasText: 'Cancelar' }).click();
    await page.waitForTimeout(500);

    // Should be back at home
    await expect(page.locator('text=Crear rutina')).toBeVisible();
  });
});
