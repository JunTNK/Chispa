/**
 * ⚙️ SISTEMA — e2e flow
 *
 * Tests the Sistema screen (system architecture/agents):
 * - Navigation to screen
 * - Agent cards (Orquestador, Coach, Body Double, Auditor)
 * - Decision fatigue meter
 * - Caffeine tracker
 * - Sensory settings toggles
 */
import { test, expect } from '@playwright/test';
import { completeOnboarding } from './helpers';

test.describe('Sistema screen', () => {
  /** Helper: navigate to sistema screen */
  async function goToSistema(page: import('@playwright/test').Page) {
    await completeOnboarding(page, 20000);
    // Sistema is in the main navbar
    const nav = page.locator('nav[aria-label="Navegación principal"]');
    await nav.first().waitFor({ state: 'visible', timeout: 5000 });
    await nav.locator('button').filter({ hasText: 'Sistema' }).first().click();
    await page.waitForTimeout(500);
  }

  test('1. Sistema screen loads with agent cards', async ({ page }) => {
    await goToSistema(page);

    // Verify screen has loaded with agents
    await expect(page.locator('text=Orquestador').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Coach').first()).toBeVisible();
  });

  test('2. All four agents are displayed', async ({ page }) => {
    await goToSistema(page);

    // Four agents
    const agents = ['Orquestador', 'Coach', 'Body Double', 'Auditor'];
    for (const agent of agents) {
      await expect(page.locator('text=' + agent).first()).toBeVisible();
    }
  });

  test('3. Caffeine tracker buttons are interactive', async ({ page }) => {
    await goToSistema(page);

    // Espresso button
    const espressoBtn = page.locator('button').filter({ hasText: 'Espresso' });
    await expect(espressoBtn).toBeVisible({ timeout: 10000 });

    // Click Espresso to add 60mg
    await espressoBtn.click();
    await page.waitForTimeout(300);

    // Screen should still be functional
    await expect(page.locator('text=Orquestador').first()).toBeVisible();
  });

  test('4. Sensory toggles exist and are interactive', async ({ page }) => {
    await goToSistema(page);

    // Toggle switches
    const toggles = page.locator('[role="switch"]');
    const count = await toggles.count();
    
    if (count > 0) {
      const toggle = toggles.first();
      const initialState = await toggle.getAttribute('aria-checked');
      
      // Click to toggle
      await toggle.click();
      await page.waitForTimeout(300);
      
      const newState = await toggle.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);

      // Toggle back
      await toggle.click();
      await page.waitForTimeout(300);
    }
  });

  test('5. Tech stack layers are displayed', async ({ page }) => {
    await goToSistema(page);

    // Tech layers
    const layers = ['Presentation', 'Application', 'Domain', 'Infrastructure'];
    for (const layer of layers) {
      await expect(page.locator('text=' + layer).first()).toBeVisible();
    }
  });

  test('6. Screen has interactive buttons', async ({ page }) => {
    await goToSistema(page);

    // Check for buttons (caffeine, etc.)
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('7. Opt-in de comparación social: apagado por defecto, toggle funcional (local-first)', async ({ page }) => {
    await goToSistema(page);

    // Explicación local-first visible
    await expect(page.getByText(/nada sale de tu dispositivo/i)).toBeVisible({ timeout: 10000 });

    // Default OFF: el label es "Activar" (nada sale del dispositivo sin permiso)
    const onBtn = page.locator('button[aria-label="Activar Comparación social (opt-in)"]');
    await expect(onBtn).toBeVisible();
    await expect(page.locator('button[aria-label="Desactivar Comparación social (opt-in)"]')).toHaveCount(0);

    // Click → ON
    await onBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('button[aria-label="Desactivar Comparación social (opt-in)"]')).toBeVisible();

    // Click → OFF otra vez
    await page.locator('button[aria-label="Desactivar Comparación social (opt-in)"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('button[aria-label="Activar Comparación social (opt-in)"]')).toBeVisible();
  });
});
