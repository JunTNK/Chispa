import { type Page, type Locator } from '@playwright/test';

// ══════════════════════════════════════════════════════════════════════════════
// ONBOARDING HELPERS
// ══════════════════════════════════════════════════════════════════════════════

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
/**
 * CTA del welcome con reintento. En producción el CTA tiene un busy de ~800ms
 * que puede tragarse el click y dejar la pantalla sin navegar; en vez de
 * esperar un timeout fijo, esperamos a que el input del paso 1 aparezca y
 * reintentamos el click si no navegó (máx. 3 intentos).
 */
async function clickWelcomeCta(page: Page): Promise<void> {
  const cta = page.locator('#cta-btn');
  const nameInput = page.locator('input').first();
  for (let attempt = 1; attempt <= 3; attempt++) {
    await cta.waitFor({ state: 'visible', timeout: 15000 });
    // Pausa corta: deja que el CTA termine cualquier re-render/hidratación
    await page.waitForTimeout(250);
    await cta.click().catch(() => {});
    try {
      await nameInput.waitFor({ state: 'visible', timeout: 10000 });
      return; // navegó al paso 1 (Name)
    } catch {
      // No navegó (busy del CTA) → reintentar
    }
  }
  throw new Error('El CTA del welcome no navegó al onboarding tras 3 intentos');
}

export async function navigateOnboarding(page: Page, targetStep: number) {
  // Step 0: Welcome → click CTA (con reintento si el busy se traga el click)
  await clickWelcomeCta(page);
  if (targetStep <= 0) return;

  // Step 1: Name
  await page.locator('input').first().fill('Test');
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

// ══════════════════════════════════════════════════════════════════════════════
// NAVIGATION HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/** Get the main navigation bar locator */
export function getNav(page: Page): Locator {
  return page.locator('nav[aria-label="Navegación principal"]');
}

/** Screen names that map to navbar buttons */
type NavScreen = 'Inicio' | 'Quest' | 'Coach' | 'Sistema' | 'Crear rutina';

/**
 * Navigate to a screen via the main navbar.
 * Use this for: Inicio, Quest, Coach, Sistema
 */
export async function navigateToNavScreen(page: Page, screen: NavScreen, waitMs = 500) {
  const nav = getNav(page);
  await nav.locator('button').filter({ hasText: screen }).click();
  await page.waitForTimeout(waitMs);
}

/**
 * Navigate to a screen via the "Más" (extra) menu.
 * Use this for: Perfil, Progreso, Logros, Ranking, Ejercicios, Dopamina, Bitácora
 */
export async function openExtraMenu(page: Page, label: string) {
  const nav = getNav(page);
  await nav.locator('button', { hasText: 'Más' }).click();
  await page.waitForTimeout(200);
  await nav.locator('button', { hasText: label }).click();
  await page.waitForTimeout(400);
}

/**
 * Navigate to a screen by clicking a text link on the home screen.
 * Use this for: Crear rutina, Registro rápido, Bitácora
 */
export async function navigateFromHome(page: Page, text: string, waitMs = 500) {
  await page.locator('text=' + text).first().click();
  await page.waitForTimeout(waitMs);
}

/**
 * Click the back button and wait.
 */
export async function goBack(page: Page, waitMs = 500) {
  await page.locator('button[aria-label="Volver"]').click();
  await page.waitForTimeout(waitMs);
}



// ══════════════════════════════════════════════════════════════════════════════
// WAIT HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Wait for home screen to be visible (checks for "Crear rutina" button).
 */
export async function waitForHome(page: Page, timeout = 10000) {
  await page.locator('text=Crear rutina').first().waitFor({ state: 'visible', timeout });
}

/**
 * Wait for any text to appear on screen.
 */
export async function waitForText(page: Page, text: string, timeout = 5000) {
  await page.locator('text=' + text).first().waitFor({ state: 'visible', timeout });
}



// ══════════════════════════════════════════════════════════════════════════════
// COMMON TEST PATTERNS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Run a complete session flow: check-in → plan → session.
 * Returns the startBtn locator if a session is available, or null if rest day.
 *
 * Tras el onboarding la app ya siembra un check-in amable y el home
 * auto-genera el plan, así que "Calcular mi día" puede no estar visible:
 * solo se clica si existe y luego se espera el plan ("Empezar ahora" o descanso).
 */
export async function runCheckIn(page: Page) {
  await dismissPortal(page);
  const calcBtn = page.locator('button').filter({ hasText: 'Calcular mi día' });
  if (await calcBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await calcBtn.click();
  }

  const startBtn = page.locator('button').filter({ hasText: 'Empezar ahora' });
  try {
    await startBtn.waitFor({ state: 'visible', timeout: 8000 });
    return startBtn;
  } catch {
    return null; // Rest day
  }
}

/**
 * Complete all sets in a session until summary appears.
 * Returns true if summary was reached, false otherwise.
 */
export async function completeAllSets(page: Page, maxSets = 10): Promise<boolean> {
  for (let i = 0; i < maxSets; i++) {
    const setBtn = page.getByRole('button', { name: /Serie hecha|Terminar ejercicio/ }).first();
    if (await setBtn.isVisible().catch(() => false)) {
      await setBtn.click();
      await page.waitForTimeout(700);
    } else {
      break;
    }
  }

  const saveBtn = page.locator('button').filter({ hasText: 'Guardar entrenamiento' });
  try {
    await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN AUDIT HELPERS (unchanged)
// ══════════════════════════════════════════════════════════════════════════════

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
