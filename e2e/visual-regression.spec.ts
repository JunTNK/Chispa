/**
 * 📸 VISUAL REGRESSION — e2e screenshot tests
 *
 * Captures baseline screenshots of key screens for visual regression testing.
 * Run with: npx playwright test e2e/visual-regression.spec.ts --update-screenshots
 * Compare with: npx playwright test e2e/visual-regression.spec.ts
 */
import { test, expect } from '@playwright/test';
import {
  completeOnboarding,
  navigateToNavScreen,
  openExtraMenu,
  navigateFromHome,
} from './helpers';

// Configure screenshot options
const screenshotOptions = {
  fullPage: true,
  animations: 'disabled' as const,
};

test.describe('Visual Regression — Key Screens', () => {
  test('1. Welcome screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Wait for animations to settle
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('welcome-screen.png', screenshotOptions);
  });

  test('2. Onboarding — Step 1 (Name)', async ({ page }) => {
    await page.goto('/');
    await page.locator('#cta-btn').click();
    await page.waitForTimeout(1500);
    
    await expect(page).toHaveScreenshot('onboarding-step1-name.png', screenshotOptions);
  });

  test('3. Home screen — empty state', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('home-empty.png', screenshotOptions);
  });

  test('4. Home screen — navbar visible', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await page.waitForTimeout(500);
    
    // Scroll to show navbar
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    
    await expect(page).toHaveScreenshot('home-navbar.png', screenshotOptions);
  });

  test('5. Coach screen', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await navigateToNavScreen(page, 'Coach');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('coach-screen.png', screenshotOptions);
  });

  test('6. Quest screen', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await openExtraMenu(page, 'Quest');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('quest-screen.png', screenshotOptions);
  });

  test('7. Dopamina screen', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await openExtraMenu(page, 'Dopamina');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('dopamina-screen.png', screenshotOptions);
  });

  test('8. Sistema screen', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await navigateToNavScreen(page, 'Sistema');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('sistema-screen.png', screenshotOptions);
  });

  test('9. Profile screen', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await openExtraMenu(page, 'Perfil');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('profile-screen.png', screenshotOptions);
  });

  test('10. Quick log — duration step', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await navigateFromHome(page, 'Registro rápido');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('quicklog-duration.png', screenshotOptions);
  });

  test('11. Create workout — muscle groups', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await navigateFromHome(page, 'Crear rutina');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('create-workout-muscles.png', screenshotOptions);
  });

  test('12. Journal — empty state', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await navigateFromHome(page, 'Bitácora');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('journal-empty.png', screenshotOptions);
  });
});

test.describe('Visual Regression — Themes', () => {
  test('13. Dark theme — home', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('theme-dark-home.png', screenshotOptions);
  });

  test('14. Light theme — home', async ({ page }) => {
    await completeOnboarding(page, 20000);
    
    // Switch to light theme via profile
    await openExtraMenu(page, 'Perfil');
    await page.waitForTimeout(500);
    
    // Find and click light theme toggle
    const lightToggle = page.locator('[role="switch"]').first();
    if (await lightToggle.isVisible()) {
      await lightToggle.click();
      await page.waitForTimeout(500);
    }
    
    // Go back to home
    await page.locator('nav[aria-label="Navegación principal"] button').filter({ hasText: 'Inicio' }).first().click();
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('theme-light-home.png', screenshotOptions);
  });

  test('15. High contrast theme — home', async ({ page }) => {
    await completeOnboarding(page, 20000);
    
    // Switch to high contrast via profile
    await openExtraMenu(page, 'Perfil');
    await page.waitForTimeout(500);
    
    // Find and click high contrast toggle
    const hcToggle = page.locator('[role="switch"]').nth(1);
    if (await hcToggle.isVisible()) {
      await hcToggle.click();
      await page.waitForTimeout(500);
    }
    
    // Go back to home
    await page.locator('nav[aria-label="Navegación principal"] button').filter({ hasText: 'Inicio' }).first().click();
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('theme-hc-home.png', screenshotOptions);
  });
});

test.describe('Visual Regression — Components', () => {
  test('16. Navbar — all states', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await page.waitForTimeout(500);
    
    // Screenshot of navbar at bottom
    const nav = page.locator('nav[aria-label="Navegación principal"]').first();
    await expect(nav).toHaveScreenshot('navbar-default.png');
  });

  test('17. Boss battle — quest screen', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await openExtraMenu(page, 'Quest');
    await page.waitForTimeout(500);
    
    // Scroll to boss section
    await page.evaluate(() => {
      const bossSection = document.querySelector('[class*="boss"]') || document.querySelector('h3');
      if (bossSection) bossSection.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(300);
    
    await expect(page).toHaveScreenshot('quest-boss-battle.png', screenshotOptions);
  });

  test('18. Skill tree — quest screen', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await openExtraMenu(page, 'Quest');
    await page.waitForTimeout(500);
    
    // Scroll to skill tree
    await page.evaluate(() => {
      const skillTree = document.querySelector('h2');
      if (skillTree) skillTree.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(300);
    
    await expect(page).toHaveScreenshot('quest-skill-tree.png', screenshotOptions);
  });

  test('19. Dopamine menu — aperitivo section', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await openExtraMenu(page, 'Dopamina');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('dopamina-aperitivo.png', screenshotOptions);
  });

  test('20. Habit stacking — dopamina screen', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await openExtraMenu(page, 'Dopamina');
    await page.waitForTimeout(500);
    
    // Scroll to habit stacking
    await page.evaluate(() => {
      const habitSection = Array.from(document.querySelectorAll('h2')).find(h => h.textContent?.includes('Habit'));
      if (habitSection) habitSection.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(300);
    
    await expect(page).toHaveScreenshot('dopamina-habit-stacking.png', screenshotOptions);
  });

  test('21. Decision fatigue meter — sistema screen', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await navigateToNavScreen(page, 'Sistema');
    await page.waitForTimeout(500);
    
    // Scroll to fatigue meter
    await page.evaluate(() => {
      const fatigueSection = Array.from(document.querySelectorAll('span')).find(s => s.textContent?.includes('Fatiga'));
      if (fatigueSection) fatigueSection.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(300);
    
    await expect(page).toHaveScreenshot('sistema-fatigue-meter.png', screenshotOptions);
  });

  test('22. Caffeine tracker — sistema screen', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await navigateToNavScreen(page, 'Sistema');
    await page.waitForTimeout(500);
    
    // Scroll to caffeine tracker
    await page.evaluate(() => {
      const caffeineSection = Array.from(document.querySelectorAll('span')).find(s => s.textContent?.includes('Cafeína'));
      if (caffeineSection) caffeineSection.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(300);
    
    await expect(page).toHaveScreenshot('sistema-caffeine-tracker.png', screenshotOptions);
  });
});
