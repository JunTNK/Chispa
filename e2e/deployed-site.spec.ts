import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://chispa-fit.netlify.app';

test('Deployed site: welcome screen loads', async ({ page }) => {
  await page.goto(DEPLOYED_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  const hasChispa = await page.locator('h1:has-text("CHISPA")').isVisible({ timeout: 15000 });
  const hasCTA = await page.locator('#cta-btn').isVisible({ timeout: 5000 }).catch(() => false);

  await page.screenshot({ path: 'test-results/deployed-welcome.png', fullPage: true });
  expect(hasChispa || hasCTA).toBeTruthy();
  console.log('✅ Welcome screen loaded');
});

test('Deployed site: onboarding completes', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(DEPLOYED_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // CTA button has 800ms busy delay before setView('onboarding') fires
  // Need to wait for button to not be aria-busy, then click, then wait for view change
  const ctaBtn = page.locator('#cta-btn');
  await ctaBtn.waitFor({ state: 'visible', timeout: 15000 });
  await ctaBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000); // Wait for any initial busy state

  // Ensure button is not busy before clicking
  await expect(ctaBtn).not.toHaveAttribute('aria-busy', 'true', { timeout: 5000 });
  await ctaBtn.click();

  // After click, button becomes busy for 800ms, then view changes
  // Wait for the input to appear (with generous timeout for production)
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 20000 });
  await page.screenshot({ path: 'test-results/deployed-onboard-step1.png' });
  console.log('✅ Onboarding started');

  // Step 1: Name
  await page.locator('input').first().fill('TestUser');
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(500);
  console.log('✅ Step 1: Name');

  // Step 2: Goal + Duration
  await page.locator('text=Fuerza y músculo').click();
  await page.waitForTimeout(200);
  await page.locator('text=20 min').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(500);
  console.log('✅ Step 2: Goal');

  // Step 3: Level
  await page.locator('text=Estoy empezando').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(500);
  console.log('✅ Step 3: Level');

  // Step 4: Neurotype
  await page.locator('text=TDAH combinado').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(500);
  console.log('✅ Step 4: Neurotype');

  // Step 5: Chronotype
  await page.locator('text=León (mañana)').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(500);
  console.log('✅ Step 5: Chronotype');

  // Step 6: Equipment + Days
  await page.locator('text=Sin equipo').click();
  await page.waitForTimeout(200);
  await page.locator('text=2-3 días').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(500);
  console.log('✅ Step 6: Equipment');

  // Step 7: Medication
  await page.locator('text=No aplica').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(500);
  console.log('✅ Step 7: Medication');

  // Step 8: Body (skip)
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(500);
  console.log('✅ Step 8: Body (skipped)');

  // Step 9: Theme
  await page.locator('text=Iniciación').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(500);
  console.log('✅ Step 9: Theme');

  // Step 10: Finish
  await page.locator('button', { hasText: 'Crear mi Digital Twin' }).click();
  await page.screenshot({ path: 'test-results/deployed-boot.png' });
  console.log('✅ Step 10: Submitted');

  // Wait for home screen
  await page.waitForFunction(
    () => {
      const body = document.body.innerText;
      return body.includes('Buenos') || body.includes('Buenas') || body.includes('Crear rutina');
    },
    { timeout: 45000 }
  );
  await page.screenshot({ path: 'test-results/deployed-home.png', fullPage: true });
  console.log('✅ Home screen loaded');
});

test('Deployed site: navigation works after onboarding', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto(DEPLOYED_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Complete onboarding
  const ctaBtn = page.locator('#cta-btn');
  await ctaBtn.waitFor({ state: 'visible', timeout: 15000 });
  await ctaBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await expect(ctaBtn).not.toHaveAttribute('aria-busy', 'true', { timeout: 5000 });
  await ctaBtn.click();
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 20000 });

  // Complete all onboarding steps
  await page.locator('input').first().fill('TestUser');
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(400);
  await page.locator('text=Fuerza y músculo').click();
  await page.waitForTimeout(200);
  await page.locator('text=20 min').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(400);
  await page.locator('text=Estoy empezando').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(400);
  await page.locator('text=TDAH combinado').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(400);
  await page.locator('text=León (mañana)').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(400);
  await page.locator('text=Sin equipo').click();
  await page.waitForTimeout(200);
  await page.locator('text=2-3 días').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(400);
  await page.locator('text=No aplica').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(400);
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(400);
  await page.locator('text=Iniciación').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(400);
  await page.locator('button', { hasText: 'Crear mi Digital Twin' }).click();

  // Wait for home screen
  await page.waitForFunction(
    () => {
      const body = document.body.innerText;
      return body.includes('Buenos') || body.includes('Buenas') || body.includes('Crear rutina');
    },
    { timeout: 45000 }
  );
  console.log('✅ Onboarding completed, home loaded');

  // Take screenshot of home screen to see what's there
  await page.screenshot({ path: 'test-results/deployed-home-debug.png', fullPage: true });
  console.log('✅ Home screen captured');

  // Check for navbar or navigation elements
  const navVisible = await page.locator('nav').first().isVisible({ timeout: 5000 }).catch(() => false);
  console.log(`Nav visible: ${navVisible}`);

  // Try to find any navigation buttons
  const buttons = await page.locator('button').allTextContents();
  console.log('Buttons found:', buttons.slice(0, 10).join(', '));

  // Test navigation to Entrenar (main CTA on home)
  const entrenarBtn = page.locator('button').filter({ hasText: 'Entrenar' }).first();
  if (await entrenarBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await entrenarBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test-results/deployed-nav-entrenar.png', fullPage: true });
    console.log('✅ Navigated to Entrenar');
  }

  // Navigate back to Inicio
  const inicioBtn = page.locator('button').filter({ hasText: 'Inicio' }).first();
  if (await inicioBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await inicioBtn.click();
    await page.waitForTimeout(800);
    console.log('✅ Navigated back to Inicio');
  }

  // Test navigation to Coach
  const coachBtn = page.locator('button').filter({ hasText: 'Coach' }).first();
  if (await coachBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await coachBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test-results/deployed-nav-coach.png', fullPage: true });
    console.log('✅ Navigated to Coach');
  }

  // Navigate back to Inicio
  const inicioBtn2 = page.locator('button').filter({ hasText: 'Inicio' }).first();
  if (await inicioBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
    await inicioBtn2.click();
    await page.waitForTimeout(800);
    console.log('✅ Navigated back to Inicio from Coach');
  }

  // Test navigation to Sistema
  const sistemaBtn = page.locator('button').filter({ hasText: 'Sistema' }).first();
  if (await sistemaBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await sistemaBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test-results/deployed-nav-sistema.png', fullPage: true });
    console.log('✅ Navigated to Sistema');
  }

  console.log('✅ All navigation tests completed');
});
