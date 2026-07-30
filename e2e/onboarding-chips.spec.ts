import { test, expect } from '@playwright/test';
import { navigateOnboarding } from './helpers';

const navigateToStep = navigateOnboarding;

test.describe('Onboarding — chip layout and icons', () => {
  test('1. Duration chips (10, 20, 30 min) have correct icons', async ({ page }) => {
    await page.goto('/');
    await navigateToStep(page, 1);

    // Select a goal to reveal duration chips
    await page.locator('text=Fuerza y músculo').click();
    await page.waitForTimeout(200);

    const chips = page.locator('button').filter({ hasText: /^\d+ min/ });
    await expect(chips).toHaveCount(3);

    // Verify each chip has an SVG icon
    const chipTexts = ['10 min', '20 min', '30 min'];
    for (const text of chipTexts) {
      const chip = page.locator('button').filter({ hasText: text });
      await expect(chip).toBeVisible();
      await expect(chip.locator('svg')).toHaveCount(1);
    }
  });

  test('2. Days chips (2-3, 4-5, Flexible) have correct icons', async ({ page }) => {
    await page.goto('/');
    await navigateToStep(page, 5);

    // Select equipment to reveal days chips
    await page.locator('text=Sin equipo').click();
    await page.waitForTimeout(200);

    const chips = page.locator('button').filter({ hasText: /2-3 días|4-5 días|Flexible/ });
    await expect(chips).toHaveCount(3);

    const chipTexts = ['2-3 días', '4-5 días', 'Flexible'];
    for (const text of chipTexts) {
      const chip = page.locator('button').filter({ hasText: text });
      await expect(chip).toBeVisible();
      await expect(chip.locator('svg')).toHaveCount(1);
    }
  });

  test('3. Medication time chips (07:00-10:00) appear with short-acting', async ({ page }) => {
    await page.goto('/');
    await navigateToStep(page, 6);

    // Select "Acción corta" to reveal time chips
    await page.locator('text=Acción corta').click();
    await page.waitForTimeout(400);

    const chips = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ });
    await expect(chips).toHaveCount(4);

    // Verify each has a Clock SVG icon
    const times = ['07:00', '08:00', '09:00', '10:00'];
    for (const t of times) {
      const chip = page.locator('button').filter({ hasText: t });
      await expect(chip).toBeVisible();
      await expect(chip.locator('svg')).toHaveCount(1);
    }
  });

  test('4. Medication time chips also appear with long-acting', async ({ page }) => {
    await page.goto('/');
    await navigateToStep(page, 6);

    await page.locator('text=Acción larga').click();
    await page.waitForTimeout(400);

    const chips = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ });
    await expect(chips).toHaveCount(4);
  });

  test('5. "No aplica" hides medication time chips', async ({ page }) => {
    await page.goto('/');
    await navigateToStep(page, 6);

    // First verify chips appear with short-acting
    await page.locator('text=Acción corta').click();
    await page.waitForTimeout(300);
    await expect(page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ })).toHaveCount(4);

    // Now click "No aplica" — chips should disappear
    await page.locator('text=No aplica').click();
    await page.waitForTimeout(400);
    await expect(page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ })).toHaveCount(0);
  });

  test('6. Selecting a medication time chip applies visual feedback', async ({ page }) => {
    await page.goto('/');
    await navigateToStep(page, 6);

    await page.locator('text=Acción corta').click();
    await page.waitForTimeout(300);

    const chip = page.locator('button').filter({ hasText: '08:00' });
    await chip.click();
    await page.waitForTimeout(200);

    // After click, the chip should have a selected class
    const className = await chip.getAttribute('class');
    expect(className).toContain('border-[');
  });

  test('7. Chips reappear after switching back to short-acting', async ({ page }) => {
    await page.goto('/');
    await navigateToStep(page, 6);

    // Select short-acting → chips appear
    await page.locator('text=Acción corta').click();
    await page.waitForTimeout(300);
    await expect(page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ })).toHaveCount(4);

    // Switch to "No aplica" → chips disappear
    await page.locator('text=No aplica').click();
    await page.waitForTimeout(300);
    await expect(page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ })).toHaveCount(0);

    // Switch back to short-acting → chips reappear
    await page.locator('text=Acción corta').click();
    await page.waitForTimeout(300);
    await expect(page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ })).toHaveCount(4);
  });

  test('8. Continue button disabled until medication time is selected', async ({ page }) => {
    await page.goto('/');
    await navigateToStep(page, 6);

    await page.locator('text=Acción corta').click();
    await page.waitForTimeout(300);

    // Continue should be disabled initially
    const continueBtn = page.locator('button', { hasText: 'Continuar' });
    await expect(continueBtn).toBeDisabled();

    // Select a time → Continue should be enabled
    await page.locator('button').filter({ hasText: '08:00' }).click();
    await page.waitForTimeout(200);
    await expect(continueBtn).toBeEnabled();
  });
});
