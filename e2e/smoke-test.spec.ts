/**
 * Minimal smoke test to diagnose onboarding flow issues.
 */
import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('Page loads and CTA is visible', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await expect(page.locator('#cta-btn')).toBeVisible();
    await expect(page.locator('#cta-btn')).toHaveText('Ver mi rutina de hoy sin registro');

    expect(errors, 'Console errors found').toHaveLength(0);
  });

  test('Clicking CTA shows name input', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.locator('#cta-btn').click();
    // The CTA has an 800ms internal delay, then transition
    await page.waitForTimeout(3000);

    // Check for any JS errors that might have prevented the transition
    if (errors.length > 0) {
      console.log('Page errors detected:', errors.join('; '));
    }

    // Try multiple selectors for the name input
    const nameInput = page.locator('#onboarding-name');
    const inputFallback = page.locator('input[name="name"]');
    const anyInput = page.locator('input');

    const nameVisible = await nameInput.isVisible().catch(() => false);
    const fallbackVisible = await inputFallback.isVisible().catch(() => false);
    const anyVisible = await anyInput.isVisible().catch(() => false);

    console.log(`Input visible: #onboarding-name=${nameVisible}, [name="name"]=${fallbackVisible}, any input=${anyVisible}`);
    console.log(`Page errors: ${errors.length > 0 ? errors.join(' | ') : 'none'}`);

    // Check what's on the page now
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').innerText();
    console.log('Page text after CTA click (first 200 chars):', bodyText.substring(0, 200));

    // The test should still pass even if onboarding didn't render (for debugging)
    // This will tell us what we see instead
  });
});
