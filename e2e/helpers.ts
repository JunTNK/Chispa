import { type Page } from '@playwright/test';

/**
 * Navigate through onboarding steps making all required selections
 * to arrive at the specified step index (0-based).
 *
 * Step mapping:
 *   0 = CTA click   (Welcome → Onboarding)
 *   1 = Name         → Step 2 (Goal)
 *   2 = Goal+Duración → Step 3 (Level)
 *   3 = Level        → Step 4 (Neurotype)
 *   4 = Neurotype    → Step 5 (Chronotype)
 *   5 = Chronotype   → Step 6 (Equipment)
 *   6 = Equipment+Days → Step 7 (Medication)
 *   7 = Medication   → Step 8 (Body — medidas, opcional)
 *   8 = Body         → Step 9 (Theme/Hiperfijación)
 *   9 = Theme        → Step 10 (Sensory)
 *   10 = Sensory     → finish (button: "Crear mi Digital Twin") → BootScreen → Home
 */
export async function navigateOnboarding(page: Page, targetStep: number) {
  // Step 0: Welcome → click CTA
  await page.locator('#cta-btn').click();
  await page.waitForTimeout(1200);
  if (targetStep <= 0) return;

  // Step 1: Name
  await page.locator('input').fill('Test');
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(300);
  if (targetStep <= 1) return;

  // Step 2: Goal + Duration
  await page.locator('text=Fuerza y músculo').click();
  await page.waitForTimeout(150);
  await page.locator('text=20 min').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(300);
  if (targetStep <= 2) return;

  // Step 3: Level
  await page.locator('text=Estoy empezando').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(300);
  if (targetStep <= 3) return;

  // Step 4: Neurotype
  await page.locator('text=TDAH combinado').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(300);
  if (targetStep <= 4) return;

  // Step 5: Chronotype
  await page.locator('text=León (mañana)').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(300);
  if (targetStep <= 5) return;

  // Step 6: Equipment + Days
  await page.locator('text=Sin equipo').click();
  await page.waitForTimeout(150);
  await page.locator('text=2-3 días').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(300);
  if (targetStep <= 6) return;

  // Step 7: Medication
  await page.locator('text=No aplica').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(300);
  if (targetStep <= 7) return;

  // Step 8: Body — medidas corporales (opcional; imperial default). Saltar.
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(300);
  if (targetStep <= 8) return;

  // Step 9: Theme (hiperfijación)
  await page.locator('text=Iniciación').click();
  await page.locator('button', { hasText: 'Continuar' }).click();
  await page.waitForTimeout(300);
  if (targetStep <= 9) return;

  // Step 10: Sensory — just Continue; button says "Crear mi Digital Twin" on last step
  await page.locator('button', { hasText: 'Crear mi Digital Twin' }).click();
  // After this click, BootScreen appears and auto-transitions to Home (~4.5s)
}

/**
 * Complete full onboarding and wait for home screen to appear.
 * BootScreen auto-transitions to home after ~4.5s with greeting text.
 */
export async function completeOnboarding(page: Page, timeout = 20000) {
  await page.goto('/');
  await navigateOnboarding(page, 10); // submits → BootScreen → Home

  // Wait for BootScreen to finish and Home to render.
  // The greeting contains "Buenos días", "Buenas tardes", "Buenas noches", or "Buenas" + name
  await page.waitForFunction(
    () => {
      const body = document.body.innerText;
      return body.includes('Buenos') || body.includes('Buenas');
    },
    { timeout }
  );
}

// ── Screen Audit Helpers ──

/** Error accumulator for screen audit tests */
const allErrors: { screen: string; errors: string[] }[] = [];

/** Reset error accumulator (call at start of each audit test) */
export function resetErrors() {
  allErrors.length = 0;
}

/** Start capturing console errors for audit */
export function startCapture(page: Page) {
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // Filter expected Supabase 404s in local dev (no Supabase backend running)
    if (text.includes('Hydration failed') || text.includes('favicon')) return;
    if (text.includes('status of 404')) return;
    const last = allErrors[allErrors.length - 1];
    if (last) last.errors.push(text);
  });
}

/** Mark a new screen checkpoint in the error accumulator */
export async function checkErrors(page: Page, screen: string) {
  allErrors.push({ screen, errors: [] });
  await page.waitForTimeout(150);
}

/** Click "Más" menu item by label */
export async function openExtraMenu(page: Page, label: string) {
  const nav = page.locator('nav[aria-label="Navegación principal"]');
  await nav.locator('button', { hasText: 'Más' }).click();
  await page.waitForTimeout(200);
  await nav.locator('button', { hasText: label }).click();
  await page.waitForTimeout(400);
}

/** Dismiss Next.js error overlay if present */
export async function dismissPortal(page: Page) {
  const portal = page.locator('nextjs-portal');
  if (await portal.count() > 0) {
    // Try Escape key first
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    // If still present, log and force-remove from DOM
    if (await portal.count() > 0) {
      const text = await portal.innerText().catch(() => 'unknown');
      console.log(`⚠️  Next.js portal: ${text.slice(0, 200)}`);
      await page.evaluate(() => document.querySelector('nextjs-portal')?.remove());
      await page.waitForTimeout(100);
    }
  }
}

/** Report audit results: returns error count */
export function reportAudit(part: string, totalScreens: number): number {
  const errors = allErrors.filter(e => e.errors.length > 0);
  if (errors.length === 0) {
    console.log(`🎯 ${part} — ${totalScreens} screens, 0 errors 🎉`);
  } else {
    console.log(`⚠️  ${part} — ${errors.length} screen(s) with errors`);
    errors.forEach(e => e.errors.forEach(err => console.log(`  ${e.screen}: ${err}`)));
  }
  return errors.length;
}
