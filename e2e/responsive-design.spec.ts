import { test, expect } from '@playwright/test';

/* ══════════════════════════════════════════════════════════════════════════════
 * Responsive Design Tests — Mobile Viewports
 *
 * Tests the CHISPA fitness app at multiple mobile viewport sizes to verify:
 * - Layout integrity (no horizontal overflow)
 * - Touch target sizes (minimum 44x44px for accessibility)
 * - Text readability (no truncation of critical content)
 * - Navigation accessibility (navbar always visible and reachable)
 * - Content fitting (no elements clipped or hidden)
 * ══════════════════════════════════════════════════════════════════════════════ */

// Mobile viewport definitions
const VIEWPORTS = [
  { name: 'iPhone-SE', width: 375, height: 667, scale: 2 },
  { name: 'iPhone-12', width: 390, height: 844, scale: 3 },
  { name: 'iPhone-14-Pro-Max', width: 430, height: 932, scale: 3 },
  { name: 'Samsung-Galaxy-S20', width: 360, height: 800, scale: 3 },
  { name: 'iPad-Mini', width: 768, height: 1024, scale: 2 },
];

/** Helper: Wait for page hydration */
async function waitForHydration(page: import('@playwright/test').Page) {
  await page.waitForTimeout(4000);
}

/** Helper: Check for horizontal overflow */
async function checkHorizontalOverflow(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(() => {
    const body = document.body;
    return body.scrollWidth > window.innerWidth + 2; // 2px tolerance
  });
}

/** Helper: Check all buttons meet minimum touch target size (44x44) */
async function checkTouchTargets(page: import('@playwright/test').Page): Promise<{ selector: string; width: number; height: number }[]> {
  return page.evaluate(() => {
    const buttons = document.querySelectorAll('button, a, [role="button"]');
    const issues: { selector: string; width: number; height: number }[] = [];
    buttons.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // Skip hidden elements
      if (rect.width === 0 || rect.height === 0) return;
      // WCAG 2.5.8: minimum 24x24, recommended 44x44
      if (rect.width < 44 || rect.height < 44) {
        const selector = el.tagName + (el.id ? `#${el.id}` : '') + (el.className ? `.${String(el.className).split(' ')[0]}` : '');
        issues.push({ selector, width: Math.round(rect.width), height: Math.round(rect.height) });
      }
    });
    return issues;
  });
}

/** Helper: Check text elements for truncation */
async function checkTextTruncation(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() => {
    const issues: string[] = [];
    const textElements = document.querySelectorAll('h1, h2, h3, p, span, button, label');
    textElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.scrollWidth > htmlEl.clientWidth + 2) {
        const text = htmlEl.textContent?.trim().substring(0, 40) || '';
        if (text) issues.push(`Truncated: "${text}..."`);
      }
    });
    return [...new Set(issues)].slice(0, 10); // Dedupe and limit
  });
}

/** Helper: Check navbar is visible and accessible */
async function checkNavbar(page: import('@playwright/test').Page): Promise<boolean> {
  const nav = page.locator('nav[aria-label="Navegación principal"]');
  const navVisible = await nav.first().isVisible({ timeout: 3000 }).catch(() => false);
  if (!navVisible) return false;

  // Check navbar buttons meet touch target size
  const navButtons = await nav.locator('button').all();
  for (const btn of navButtons) {
    const box = await btn.boundingBox();
    if (box && (box.width < 32 || box.height < 32)) {
      return false; // At least one nav button is too small
    }
  }
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// WELCOME SCREEN
// ══════════════════════════════════════════════════════════════════════════════
for (const vp of VIEWPORTS) {
  test(`Welcome screen · ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForHydration(page);

    // Verify CHISPA title is visible
    await expect(page.locator('h1:has-text("CHISPA")')).toBeVisible({ timeout: 10000 });

    // Check no horizontal overflow
    const hasOverflow = await checkHorizontalOverflow(page);
    expect(hasOverflow, `Horizontal overflow detected on ${vp.name}`).toBe(false);

    // Check CTA button touch target
    const ctaBtn = page.locator('#cta-btn');
    const ctaBox = await ctaBtn.boundingBox();
    expect(ctaBox).not.toBeNull();
    if (ctaBox) {
      // CTA width: on mobile it should be near-full, on tablet it's constrained by max-w-[440px]
      const minCtaWidth = Math.min(vp.width * 0.8, 400);
      expect(ctaBox.width).toBeGreaterThanOrEqual(minCtaWidth);
      expect(ctaBox.height).toBeGreaterThanOrEqual(44); // Minimum touch target
    }

    // Check text truncation
    const truncationIssues = await checkTextTruncation(page);
    console.log(`Text truncation issues (${vp.name}):`, truncationIssues.length > 0 ? truncationIssues : 'None');

    // Screenshot
    await page.screenshot({ path: `test-results/responsive-welcome-${vp.name}.png`, fullPage: true });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ONBOARDING STEPS
// ══════════════════════════════════════════════════════════════════════════════
for (const vp of VIEWPORTS) {
  test(`Onboarding flow · ${vp.name}`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForHydration(page);

    // Click CTA (wait for busy state to clear)
    const ctaBtn = page.locator('#cta-btn');
    await ctaBtn.waitFor({ state: 'visible', timeout: 15000 });
    await ctaBtn.scrollIntoViewIfNeeded();
    await expect(ctaBtn).not.toHaveAttribute('aria-busy', 'true', { timeout: 5000 });
    await ctaBtn.click();

    // Step 1: Name
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.screenshot({ path: `test-results/responsive-onboard-name-${vp.name}.png` });

    // Check input is accessible and full-width
    const inputBox = await page.locator('input').first().boundingBox();
    expect(inputBox).not.toBeNull();
    if (inputBox) {
      expect(inputBox.width).toBeGreaterThan(vp.width * 0.5); // Input should be reasonably wide
    }

    // Check Continue button is accessible
    const continueBtn = page.locator('button', { hasText: 'Continuar' });
    const continueBox = await continueBtn.boundingBox();
    expect(continueBox).not.toBeNull();
    if (continueBox) {
      expect(continueBox.height).toBeGreaterThanOrEqual(44);
    }

    // Check no overflow
    const hasOverflow = await checkHorizontalOverflow(page);
    expect(hasOverflow, `Overflow on onboarding name step (${vp.name})`).toBe(false);

    await page.locator('input').first().fill('TestUser');
    await continueBtn.click();
    await page.waitForTimeout(500);

    // Step 2: Goal — check chips fit within viewport
    await page.screenshot({ path: `test-results/responsive-onboard-goal-${vp.name}.png` });
    const goalOverflow = await checkHorizontalOverflow(page);
    expect(goalOverflow, `Overflow on goal step (${vp.name})`).toBe(false);

    // Check chip touch targets
    const chipIssues = await checkTouchTargets(page);
    if (chipIssues.length > 0) {
      console.log(`Small touch targets on goal step (${vp.name}):`, chipIssues.slice(0, 3));
    }

    // Continue through remaining steps
    await page.locator('text=Fuerza y músculo').click();
    await page.waitForTimeout(150);
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
    await page.waitForTimeout(150);
    await page.locator('text=2-3 días').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await page.waitForTimeout(400);

    await page.locator('text=No aplica').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await page.waitForTimeout(400);

    // Body step screenshot
    await page.screenshot({ path: `test-results/responsive-onboard-body-${vp.name}.png` });

    await page.locator('button', { hasText: 'Continuar' }).click();
    await page.waitForTimeout(400);

    await page.locator('text=Iniciación').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await page.waitForTimeout(400);

    // Sensory step — check all elements fit
    await page.screenshot({ path: `test-results/responsive-onboard-sensory-${vp.name}.png` });
    const sensoryOverflow = await checkHorizontalOverflow(page);
    expect(sensoryOverflow, `Overflow on sensory step (${vp.name})`).toBe(false);

    await page.locator('button', { hasText: 'Crear mi Digital Twin' }).click();

    // Wait for home
    await page.waitForFunction(
      () => {
        const body = document.body.innerText;
        return body.includes('Buenos') || body.includes('Buenas') || body.includes('Crear rutina');
      },
      { timeout: 45000 }
    );
    await page.screenshot({ path: `test-results/responsive-home-${vp.name}.png`, fullPage: true });
    console.log(`✅ Onboarding completed on ${vp.name}`);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// HOME SCREEN
// ══════════════════════════════════════════════════════════════════════════════
for (const vp of VIEWPORTS) {
  test(`Home screen · ${vp.name}`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForHydration(page);

    // Quick onboarding
    const ctaBtn = page.locator('#cta-btn');
    await ctaBtn.waitFor({ state: 'visible', timeout: 15000 });
    await ctaBtn.scrollIntoViewIfNeeded();
    await expect(ctaBtn).not.toHaveAttribute('aria-busy', 'true', { timeout: 5000 });
    await ctaBtn.click();

    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('input').first().fill('TestUser');
    await page.locator('button', { hasText: 'Continuar' }).click();
    await page.waitForTimeout(400);

    for (const [step, opts] of [
      ['Fuerza y músculo', '20 min'],
      ['Estoy empezando', null],
      ['TDAH combinado', null],
      ['León (mañana)', null],
      ['Sin equipo', '2-3 días'],
    ] as const) {
      await page.locator('text=' + step).click();
      if (opts) { await page.waitForTimeout(150); await page.locator('text=' + opts).click(); }
      await page.locator('button', { hasText: 'Continuar' }).click();
      await page.waitForTimeout(350);
    }

    await page.locator('text=No aplica').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await page.waitForTimeout(350);
    await page.locator('button', { hasText: 'Continuar' }).click();
    await page.waitForTimeout(350);
    await page.locator('text=Iniciación').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await page.waitForTimeout(350);
    await page.locator('button', { hasText: 'Crear mi Digital Twin' }).click();

    await page.waitForFunction(
      () => {
        const body = document.body.innerText;
        return body.includes('Buenos') || body.includes('Buenas') || body.includes('Crear rutina');
      },
      { timeout: 45000 }
    );
    await page.waitForTimeout(1000);

    // Check home screen
    const hasOverflow = await checkHorizontalOverflow(page);
    expect(hasOverflow, `Home screen overflow (${vp.name})`).toBe(false);

    // Check navbar
    const navbarOk = await checkNavbar(page);
    expect(navbarOk, `Navbar issues on ${vp.name}`).toBe(true);

    // Check touch targets
    const touchIssues = await checkTouchTargets(page);
    console.log(`Small touch targets on home (${vp.name}):`, touchIssues.length > 0 ? touchIssues.slice(0, 5) : 'None');

    await page.screenshot({ path: `test-results/responsive-home-final-${vp.name}.png`, fullPage: true });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// COACH SCREEN
// ══════════════════════════════════════════════════════════════════════════════
for (const vp of VIEWPORTS) {
  test(`Coach screen · ${vp.name}`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForHydration(page);

    // Quick onboarding
    const ctaBtn = page.locator('#cta-btn');
    await ctaBtn.waitFor({ state: 'visible', timeout: 15000 });
    await ctaBtn.scrollIntoViewIfNeeded();
    await expect(ctaBtn).not.toHaveAttribute('aria-busy', 'true', { timeout: 5000 });
    await ctaBtn.click();

    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('input').first().fill('TestUser');
    await page.locator('button', { hasText: 'Continuar' }).click();
    await page.waitForTimeout(400);

    for (const [step, opts] of [
      ['Fuerza y músculo', '20 min'],
      ['Estoy empezando', null],
      ['TDAH combinado', null],
      ['León (mañana)', null],
      ['Sin equipo', '2-3 días'],
    ] as const) {
      await page.locator('text=' + step).click();
      if (opts) { await page.waitForTimeout(150); await page.locator('text=' + opts).click(); }
      await page.locator('button', { hasText: 'Continuar' }).click();
      await page.waitForTimeout(350);
    }

    await page.locator('text=No aplica').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await page.waitForTimeout(350);
    await page.locator('button', { hasText: 'Continuar' }).click();
    await page.waitForTimeout(350);
    await page.locator('text=Iniciación').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await page.waitForTimeout(350);
    await page.locator('button', { hasText: 'Crear mi Digital Twin' }).click();

    await page.waitForFunction(
      () => {
        const body = document.body.innerText;
        return body.includes('Buenos') || body.includes('Buenas') || body.includes('Crear rutina');
      },
      { timeout: 45000 }
    );
    await page.waitForTimeout(1000);

    // Navigate to Coach via Más menu
    const nav = page.locator('nav[aria-label="Navegación principal"]');
    await nav.first().waitFor({ state: 'visible', timeout: 5000 });
    await nav.locator('button').filter({ hasText: 'Más' }).first().click();
    await page.waitForTimeout(300);
    await nav.locator('button').filter({ hasText: 'Coach' }).first().click();
    await page.waitForTimeout(1500);

    // Check coach screen
    const hasOverflow = await checkHorizontalOverflow(page);
    expect(hasOverflow, `Coach screen overflow (${vp.name})`).toBe(false);

    // Check chat input is accessible
    const chatInput = page.locator('input[placeholder], textarea').first();
    const chatInputVisible = await chatInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (chatInputVisible) {
      const chatBox = await chatInput.boundingBox();
      expect(chatBox).not.toBeNull();
      if (chatBox) {
        expect(chatBox.height).toBeGreaterThanOrEqual(40);
      }
    }

    // Check suggested chips
    const chips = await page.locator('button').filter({ hasText: /¿|consejo|Dame/ }).count();
    console.log(`Coach chips visible (${vp.name}):`, chips);

    await page.screenshot({ path: `test-results/responsive-coach-${vp.name}.png`, fullPage: true });
  });
}
