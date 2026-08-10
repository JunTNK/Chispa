/**
 * 📓 JOURNAL — e2e flow
 *
 * Tests the journal screen:
 * - Navigation from home
 * - Empty state when no workouts exist
 * - Navigation back from journal
 */
import { test, expect } from '@playwright/test';
import {
  completeOnboarding,
  navigateFromHome,
} from './helpers';

test.describe('Journal screen', () => {
  /** Helper: navigate to journal screen */
  async function goToJournal(page: import('@playwright/test').Page) {
    await completeOnboarding(page, 20000);
    await navigateFromHome(page, 'Bitácora');
  }

  test('1. Navigate to journal from home', async ({ page }) => {
    await goToJournal(page);

    // Verify heading
    await expect(page.locator('h1').filter({ hasText: 'Bitácora' })).toBeVisible();
  });

  test('2. Empty state shows when no workouts', async ({ page }) => {
    await goToJournal(page);

    // Empty state message
    await expect(
      page.locator('text=Aún no hay sesiones aquí')
    ).toBeVisible();
  });

  test('3. Journal renders with AppLayout and navbar', async ({ page }) => {
    await goToJournal(page);

    // Verify AppLayout renders with navbar
    const nav = page.locator('nav[aria-label="Navegación principal"]').first();
    await expect(nav).toBeVisible();

    // Verify home screen elements are accessible via navbar
    await expect(nav.locator('button').filter({ hasText: 'Inicio' }).first()).toBeVisible();
  });
});
