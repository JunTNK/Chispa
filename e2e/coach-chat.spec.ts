/**
 * 🤖 COACH CHAT — e2e flow
 *
 * Tests the coach chat screen:
 * - Navigation from home
 * - Greeting message displayed
 * - Sending a message and receiving a response
 * - Suggested question chips
 * - Input validation (empty message not sent)
 */
import { test, expect } from './fixtures';
import {
  completeOnboarding,
  navigateToNavScreen,
} from './helpers';

test.describe('Coach chat flow', () => {
  /** Helper: navigate to coach screen and wait for it to fully load */
  async function goToCoach(page: import('@playwright/test').Page) {
    await completeOnboarding(page, 20000);
    await navigateToNavScreen(page, 'Coach');
    // Wait for coach screen to fully load
    await page.waitForTimeout(1500);
    // Wait for the message log to be visible
    await page.locator('[role="log"]').waitFor({ state: 'visible', timeout: 10000 });
    // Scroll to bottom to ensure chips are visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
  }

  test('1. Navigate to coach from home and see greeting', async ({ page }) => {
    await goToCoach(page);

    // Verify coach header
    await expect(page.locator('text=Coach CHISPA')).toBeVisible();

    // Verify message log area exists
    await expect(page.locator('[role="log"]')).toBeVisible();

    // Verify greeting message appears (assistant message)
    const messages = page.locator('[role="log"] > div');
    await expect(messages.first()).toBeVisible({ timeout: 5000 });
  });

  test('2. Suggested question chips are visible', async ({ page }) => {
    await goToCoach(page);

    // Wait for chips to render
    await page.waitForTimeout(500);

    // Chips can be either plan-based or default
    // Default chips: ¿Cómo funciona CHISPA?, ¿Qué es mi Digital Twin?, Dame un consejo
    // Plan chips: ¿Por qué este plan?, No tengo ganas hoy, ¿Cómo voy de consistencia?
    const allPossibleChips = [
      '¿Cómo funciona CHISPA?',
      '¿Qué es mi Digital Twin',
      'Dame un consejo',
      '¿Por qué este plan?',
      'No tengo ganas hoy',
      '¿Cómo voy de consistencia',
    ];

    // Find any of the possible chips
    let chipFound = false;
    for (const chipText of allPossibleChips) {
      const chip = page.locator('button').filter({ hasText: chipText });
      if (await chip.isVisible().catch(() => false)) {
        chipFound = true;
        break;
      }
    }

    // At least some chips should be visible
    expect(chipFound).toBe(true);
  });

  test('3. Send a typed message and receive response', async ({ page }) => {
    await goToCoach(page);

    // Type a message
    const input = page.locator('#coach-input');
    await expect(input).toBeVisible();
    await input.fill('¿Cómo funciona CHISPA?');

    // Click send button
    const sendBtn = page.locator('button[aria-label="Enviar mensaje"]');
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // User message should appear
    await expect(page.locator('text=¿Cómo funciona CHISPA?').last()).toBeVisible({ timeout: 5000 });

    // Wait for assistant response (typing indicator → response)
    await page.waitForTimeout(4000);

    // There should be at least 3 messages: greeting + user + assistant response
    const allMessages = page.locator('[role="log"] > div');
    const count = await allMessages.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('4. Click suggested question chip sends message', async ({ page }) => {
    await goToCoach(page);

    // Wait for chips to render
    await page.waitForTimeout(500);

    // Count initial messages (should be 1 — greeting)
    const initialCount = await page.locator('[role="log"] > div').count();

    // Find and click any visible chip
    const allPossibleChips = [
      '¿Cómo funciona CHISPA?',
      '¿Qué es mi Digital Twin',
      'Dame un consejo',
      '¿Por qué este plan?',
      'No tengo ganas hoy',
      '¿Cómo voy de consistencia',
    ];

    let clicked = false;
    for (const chipText of allPossibleChips) {
      const chip = page.locator('button').filter({ hasText: chipText });
      if (await chip.isVisible().catch(() => false)) {
        await chip.click();
        clicked = true;
        break;
      }
    }

    // Skip if no chip was found
    if (!clicked) {
      test.skip(true, 'No suggested question chips visible');
      return;
    }

    // Wait for response
    await page.waitForTimeout(4000);

    // Should have more messages now
    const finalCount = await page.locator('[role="log"] > div').count();
    expect(finalCount).toBeGreaterThan(initialCount);
  });

  test('5. Empty message cannot be sent', async ({ page }) => {
    await goToCoach(page);

    // Count initial messages
    const initialCount = await page.locator('[role="log"] > div').count();

    // Try to send empty message
    const sendBtn = page.locator('button[aria-label="Enviar mensaje"]');
    await expect(sendBtn).toBeDisabled();

    // Type and clear
    const input = page.locator('#coach-input');
    await input.fill('test');
    await input.fill('');

    // Send button should be disabled again
    await expect(sendBtn).toBeDisabled();

    // No new messages
    const finalCount = await page.locator('[role="log"] > div').count();
    expect(finalCount).toBe(initialCount);
  });
});
