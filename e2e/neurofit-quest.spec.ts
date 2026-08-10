/**
 * 🎮 QUEST — e2e flow
 *
 * Tests the Quest screen (gamification/progression):
 * - Navigation from home via navbar
 * - Quest header and level badge
 * - Streak card visibility
 * - Boss battle section
 * - XP/level ring display
 * - Skill tree branches
 * - Reward vault items
 * - Theme selection
 * - Heatmap display
 */
import { test, expect } from '@playwright/test';
import { completeOnboarding, openExtraMenu } from './helpers';

test.describe('Quest screen', () => {
  /** Helper: navigate to quest screen */
  async function goToQuest(page: import('@playwright/test').Page) {
    await completeOnboarding(page, 20000);
    await openExtraMenu(page, 'Quest');
  }

  test('1. Quest header and level badge are visible', async ({ page }) => {
    await goToQuest(page);

    // Verify quest header
    await expect(page.locator('text=QUEST')).toBeVisible();
    await expect(page.locator('text=Hyper-fixación')).toBeVisible();

    // Level badge should be visible
    const levelBadge = page.locator('text=/Nv\\.\\d+/');
    await expect(levelBadge.first()).toBeVisible();
  });

  test('2. Boss battle section is visible', async ({ page }) => {
    await goToQuest(page);

    // Boss section should be visible (either defeated or active)
    const bossDefeated = page.locator('text=Jefe derrotado esta semana');
    const bossActive = page.locator('text=Jefe semanal');
    
    const hasDefeated = await bossDefeated.isVisible().catch(() => false);
    const hasActive = await bossActive.isVisible().catch(() => false);
    
    expect(hasDefeated || hasActive).toBe(true);
  });

  test('3. XP ring and level progress are displayed', async ({ page }) => {
    await goToQuest(page);

    // XP display should be visible (number + resource label)
    const xpRing = page.locator('svg circle').first();
    await expect(xpRing).toBeVisible();

    // Level progress bar should be visible
    const progressBar = page.locator('[role="progressbar"], .h-2').first();
    await expect(progressBar).toBeVisible();
  });

  test('4. Skill tree branches are displayed', async ({ page }) => {
    await goToQuest(page);

    // Skill Tree header
    await expect(page.locator('text=Skill Tree')).toBeVisible();

    // Four skill branches
    const branches = ['Fuerza', 'Cardio', 'Movilidad', 'Core'];
    for (const branch of branches) {
      await expect(page.locator('text=' + branch).first()).toBeVisible();
    }
  });

  test('5. Reward vault items are displayed', async ({ page }) => {
    await goToQuest(page);

    // Reward Vault header
    await expect(page.locator('text=Reward Vault')).toBeVisible();

    // Vault items
    const vaultItems = ['30 min de videojuego', 'Episodio de tu serie', 'Snack favorito'];
    for (const item of vaultItems) {
      await expect(page.locator('text=' + item).first()).toBeVisible();
    }
  });

  test('6. Theme selection buttons are visible', async ({ page }) => {
    await goToQuest(page);

    // Theme section header
    await expect(page.locator('text=Tema de fijación')).toBeVisible();

    // Theme categories exist (Iniciación, Resistencia, Élite, etc.)
    const themeButtons = page.locator('button').filter({ hasText: /Iniciación|Resistencia|Élite|Naboría|Nitaíno/ });
    const count = await themeButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('7. Heatmap displays consistency grid', async ({ page }) => {
    await goToQuest(page);

    // Heatmap header
    await expect(page.locator('text=Consistencia')).toBeVisible();

    // Heatmap grid cells exist
    const heatmapCells = page.locator('.aspect-square');
    const count = await heatmapCells.count();
    expect(count).toBeGreaterThanOrEqual(50); // 12 weeks × ~7 days
  });

  test('8. Quest log shows recent workouts or empty state', async ({ page }) => {
    await goToQuest(page);

    // Quest log header
    await expect(page.locator('text=Últimas ganancias')).toBeVisible();

    // Either workout entries or empty state message
    const emptyState = page.locator('text=Completa un workout');
    const workoutEntries = page.locator('text=/\\+\\d+ XP/');
    
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasWorkouts = await workoutEntries.count().then(c => c > 0).catch(() => false);
    
    expect(hasEmpty || hasWorkouts).toBe(true);
  });
});
