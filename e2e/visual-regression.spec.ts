/**
 * 📸 VISUAL REGRESSION — e2e screenshot tests
 *
 * Captures baseline screenshots of key screens for visual regression testing.
 * Run with: npx playwright test e2e/visual-regression.spec.ts --update-screenshots
 * Compare with: npx playwright test e2e/visual-regression.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';
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

/**
 * Inyecta un plan FIJO en el store persistido (`chispa_store`) para que el home
 * renderice la PlanCard con contenido determinista.
 *
 * Sin esto, el auto-plan post-onboarding usa Math.random (shuffle de ejercicios
 * en TrainingAgent) → los ejercicios y el wrapping de sus nombres varían entre
 * corridas y los screenshots del home son inestables (altura + contenido).
 *
 * El `date` = hoy evita que el home auto-genere otro plan (guard `hasPlan`).
 *
 * ⚠️ Depende del formato de persistencia de zustand (`chispa_store` =
 * `{ state, version }`). Si se cambia la clave o el versionado, este seeding
 * deja de aplicar en silencio y el home vuelve a ser flaky: revisar aquí.
 */
async function seedHomePlan(page: Page) {
  await page.addInitScript(() => {
    const key = 'chispa_store';
    let store: { state?: Record<string, unknown> } = {};
    try {
      store = JSON.parse(localStorage.getItem(key) || '{}');
    } catch {
      store = {};
    }
    store.state = store.state || {};
    store.state.plan = {
      action: 'train',
      date: new Date().toISOString().slice(0, 10),
      done: false,
      intensity: 'light',
      confidence: 70,
      message: 'Mensaje determinista para visual regression.',
      reasons: ['Recuperación 63/100: sesión estándar', 'Consistencia 0%: hoy reconectamos', 'Ajustamos carga a tu energía'],
      workout: {
        focus: 'full',
        intensity: 'light',
        duration: 20,
        title: 'Sesión ligera',
        sets: 2,
        rest: 40,
        exercises: [
          { exercise_id: 'v1', name: 'Sentadilla', muscle: 'piernas', sets: 2, reps: 10, rest: 40, completed_sets: 0, completed_reps: [], status: 'pending' },
          { exercise_id: 'v2', name: 'Plancha', muscle: 'core', sets: 2, reps: 30, rest: 40, completed_sets: 0, completed_reps: [], status: 'pending' },
          { exercise_id: 'v3', name: 'Puente de glúteos', muscle: 'gluteos', sets: 2, reps: 12, rest: 40, completed_sets: 0, completed_reps: [], status: 'pending' },
          { exercise_id: 'v4', name: 'Curl femoral', muscle: 'isquios', sets: 2, reps: 10, rest: 40, completed_sets: 0, completed_reps: [], status: 'pending' },
        ],
      },
    };
    localStorage.setItem(key, JSON.stringify(store));
  });
}

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
    await seedHomePlan(page);
    await completeOnboarding(page, 20000);
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('home-empty.png', screenshotOptions);
  });

  test('4. Home screen — navbar visible', async ({ page }) => {
    await seedHomePlan(page);
    await completeOnboarding(page, 20000);
    await page.waitForTimeout(500);
    
    // Scroll to show navbar
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    
    await expect(page).toHaveScreenshot('home-navbar.png', screenshotOptions);
  });

  test('4b. Home — sesión activa (cronómetro enmascarado)', async ({ page }) => {
    await seedHomePlan(page);
    await completeOnboarding(page, 20000);
    await page.waitForTimeout(500);

    // Inicia la sesión activa desde su único punto de entrada explícito
    // (la card "Registro rápido" navega al wizard, nunca arranca el timer).
    await page.locator('button', { hasText: 'Estoy entrenando ahora' }).click();
    await page.waitForTimeout(1000);

    // El cronómetro (MM:SS) avanza cada segundo → se enmascara para que el
    // baseline sea determinista; el resto de la card es estático.
    const timer = page
      .locator('span.font-mono')
      .filter({ hasText: /^\d{2}:\d{2}$/ });
    await expect(timer).toBeVisible();

    await expect(page).toHaveScreenshot('home-live-session.png', {
      ...screenshotOptions,
      mask: [timer],
    });
  });

  test('5. Coach screen', async ({ page }) => {
    // Determinismo para visual regression:
    // - seedHomePlan → el coach usa `plan` para las preguntas sugeridas;
    //   sin él, el auto-plan (aleatorio) puede no existir aún al navegar.
    // - LocalLLM descarga Transformers.js + el modelo (~1GB) desde CDN con
    //   progreso variable → se bloquea el CDN para que el estado final sea
    //   SIEMPRE 'unavailable' ("Usando respuestas predefinidas") y el header
    //   no muestre barra de descarga ni badge con % dinámico.
    // - El avatar es una URL externa (proxiada por next/image a
    //   /_next/image?url=... con slashes codificados) → se sustituye por una
    //   imagen 1x1 fija con un patrón amplio que cubre ambas formas.
    await seedHomePlan(page);
    await completeOnboarding(page, 20000);

    await page.route('**/cdn.jsdelivr.net/**', (route) => route.abort());
    await page.route('**image.qwenlm.ai**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64'
        ),
      })
    );

    await navigateToNavScreen(page, 'Coach');

    // Esperar a que el estado del modelo se asiente en 'unavailable'
    // (el fallo del CDN es inmediato) antes de capturar.
    await page
      .getByText('Usando respuestas predefinidas')
      .waitFor({ state: 'visible', timeout: 15000 });
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
    await seedHomePlan(page);
    await completeOnboarding(page, 20000);
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('theme-dark-home.png', screenshotOptions);
  });

  test('14. Light theme — home', async ({ page }) => {
    await seedHomePlan(page);
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
    await seedHomePlan(page);
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
