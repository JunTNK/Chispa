/**
 * E2E tests for workout creation flow — muscle group selection with
 * stroke-rounded icons (v3).
 */
import { test, expect } from '@playwright/test';
import { completeOnboarding } from './helpers';

test.describe('Workout creation — muscle group icons', () => {
  test('1. Shows 4 muscle group cards with stroke-rounded SVG icons', async ({ page }) => {
    // Complete onboarding to reach home
    await completeOnboarding(page, 20000);

    // Click "Crear entrenamiento"
    await page.locator('text=Crear rutina').click();
    await page.waitForTimeout(500);

    // Verify the muscle group section is visible
    await expect(
      page.locator('text=¿Qué grupo muscular quieres trabajar?')
    ).toBeVisible();

    // Verify 4 cards exist
    const cards = page.locator('button').filter({ hasText: /Todo el cuerpo|Tren superior|Tren inferior|Core y cardio/ });
    await expect(cards).toHaveCount(4);

    // Verify each card has an SVG icon (the stroke-rounded icon)
    const cardLabels = ['Todo el cuerpo', 'Tren superior', 'Tren inferior', 'Core y cardio'];
    for (const label of cardLabels) {
      const card = page.locator('button').filter({ hasText: label });
      await expect(card).toBeVisible();
      // Each card has exactly 1 SVG (the stroke-rounded icon)
      await expect(card.locator('svg')).toHaveCount(1);
    }

    // Verify the muscle sub-labels are displayed (scoped to avoid strict-mode ambiguity)
    const fullCard = page.locator('button').filter({ hasText: 'Todo el cuerpo' });
    await expect(fullCard.locator('text=piernas · gluteos · pecho')).toBeVisible();
    const upperCard = page.locator('button').filter({ hasText: 'Tren superior' });
    await expect(upperCard.locator('text=pecho · espalda · hombros · brazos')).toBeVisible();
    const lowerCard = page.locator('button').filter({ hasText: 'Tren inferior' });
    await expect(lowerCard.locator('text=piernas · gluteos')).toBeVisible();
    const coreCard = page.locator('button').filter({ hasText: 'Core y cardio' });
    await expect(coreCard.locator('text=core · cardio')).toBeVisible();
  });

  test('2. Clicking a muscle group card navigates to exercise selection', async ({ page }) => {
    await completeOnboarding(page, 20000);

    // Click "Crear entrenamiento"
    await page.locator('text=Crear rutina').click();
    await page.waitForTimeout(500);

    // Click "Todo el cuerpo"
    await page.locator('button').filter({ hasText: 'Todo el cuerpo' }).click();
    await page.waitForTimeout(500);

    // Verify we're now on the exercise selection step
    await expect(page.locator('text=Paso 2 de 2')).toBeVisible();
    await expect(page.locator('text=Elige ejercicios')).toBeVisible();
  });

  test('3. Name input is available and editable', async ({ page }) => {
    await completeOnboarding(page, 20000);

    // Click "Crear entrenamiento"
    await page.locator('text=Crear rutina').click();
    await page.waitForTimeout(500);

    // Find the name input (placeholder contains "Full body")
    const nameInput = page.locator('input[placeholder*="Full body"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Mi rutina de prueba');
    await expect(nameInput).toHaveValue('Mi rutina de prueba');
  });

  test('4. Duration presets are selectable', async ({ page }) => {
    await completeOnboarding(page, 20000);

    // Click "Crear entrenamiento"
    await page.locator('text=Crear rutina').click();
    await page.waitForTimeout(500);

    // Click a duration button
    const durationBtn = page.locator('button').filter({ hasText: '30 min' });
    await expect(durationBtn).toBeVisible();
    await durationBtn.click();
    await page.waitForTimeout(200);

    // The button should have the active style (amber background)
    const classAttr = await durationBtn.getAttribute('class');
    expect(classAttr).toContain('#ffb454');
  });

  test('5. Elegir ejercicios button is visible and clickable', async ({ page }) => {
    await completeOnboarding(page, 20000);

    // Click "Crear entrenamiento"
    await page.locator('text=Crear rutina').click();
    await page.waitForTimeout(500);

    // Verify the CTA button exists
    const ctaBtn = page.locator('button').filter({ hasText: 'Elegir ejercicios' });
    await expect(ctaBtn).toBeVisible();
    await expect(ctaBtn).toBeEnabled();
  });

  test('6. Back button returns to home', async ({ page }) => {
    await completeOnboarding(page, 20000);

    // Click "Crear entrenamiento"
    await page.locator('text=Crear rutina').click();
    await page.waitForTimeout(500);

    // Click the back button (aria-label="Volver")
    await page.locator('button[aria-label="Volver"]').click();
    await page.waitForTimeout(500);

    // Should be back at home screen
    await expect(page.locator('text=Crear rutina')).toBeVisible();
  });
});
