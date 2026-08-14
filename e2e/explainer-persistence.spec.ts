/**
 * 🔁 EXPLAINER PERSISTENCE — e2e
 *
 * Verifica que las preferencias del explainer (velocidad de lectura, cámara
 * lenta, autoplay del flipbook y sección abierta) se RECUERDAN tras un refresh:
 *
 * FASE 1 — Siembra el store con prefs por defecto, arranca directo a la sesión,
 *          abre el explainer y cambia las 4 preferencias por la UI real.
 * FASE 2 — Recarga la página (el addInitScript no re-siembra gracias a un flag
 *          en sessionStorage) y verifica que las 4 se restauran al re-abrir.
 *
 * No depende del onboarding ni del DecisionEngine: siembra un plan controlado
 * (ejercicio "Rodillo abdominal" con 2 frames, cue y 4 pasos) y va a la vista
 * de sesión directamente. Corre en local (BASE_URL por defecto) y en producción.
 */
import { test, expect } from '@playwright/test';

const SEED = {
  onboarded: true,
  lang: 'es',
  prefs: {
    reduceMotion: false,
    highContrast: false,
    fontLarge: false,

    showFAQs: true,
    light: false,
    systemMode: false,
    audioGuide: false,
    voice: 'system',
    restPref: 'auto',
    // explainerRate / explainerSlow / explainerAutoplay / explainerOpenSection
    // quedan SIN definir → defaults (1×, off, autoplay ON, todo colapsado)
  },
  view: 'session',
  plan: {
    workout: {
      focus: 'full',
      intensity: 'standard',
      duration: 20,
      title: 'Plan de prueba',
      sets: 1,
      rest: 60,
      exercises: [
        {
          exercise_id: 'Ab_Roller',
          name: 'Rodillo abdominal',
          muscle: 'core',
          sets: 1,
          reps: 10,
          rest: 60,
          completed_sets: 0,
          completed_reps: [],
          status: 'pending',
        },
      ],
    },
  },
} as never;

async function readPrefs(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('chispa_store');
    return raw
      ? (JSON.parse(raw) as { state?: { prefs?: Record<string, unknown> } })?.state?.prefs
      : null;
  });
}

test('preferencias del explainer se recuerdan tras un refresh', async ({ page }) => {
  // Siembra SOLO en la primera carga (sessionStorage sobrevive al refresh)
  await page.addInitScript((seed) => {
    if (!sessionStorage.getItem('_chispa_seeded')) {
      localStorage.setItem('chispa_store', JSON.stringify({ state: seed }));
      sessionStorage.setItem('_chispa_seeded', '1');
    }
  }, SEED);

  // ─── FASE 1: interactuar con la UI real ───
  await page.goto(process.env.BASE_URL || 'http://localhost:3000');
  await page.waitForTimeout(2000);

  const explainerBtn = page.getByRole('button', { name: '¿Cómo se hace?' });
  await expect(explainerBtn).toBeVisible({ timeout: 20000 });
  await explainerBtn.click();
  await page.waitForTimeout(800);

  // El flipbook arranca con autoplay (pref sin definir → ?? true)
  await expect(page.getByLabel('Pausar animación')).toBeVisible({ timeout: 15000 });

  // 1) Velocidad 1× → 1.25×
  const rateBtn = page.getByLabel('Velocidad de lectura').first();
  await expect(rateBtn).toHaveText('1×');
  await rateBtn.click();
  await page.waitForTimeout(400);
  await expect(page.getByLabel('Velocidad de lectura').first()).toHaveText('1.25×');

  // 2) Cámara lenta off → on
  const slowBtn = page.getByLabel('Cámara lenta');
  await expect(slowBtn).toHaveAttribute('aria-pressed', 'false');
  await slowBtn.click();
  await page.waitForTimeout(400);
  await expect(page.getByLabel('Cámara lenta')).toHaveAttribute('aria-pressed', 'true');

  // 3) Pausar → autoplay off
  await page.getByLabel('Pausar animación').click();
  await page.waitForTimeout(400);
  await expect(page.getByLabel('Reproducir animación')).toBeVisible();

  // 4) Abrir "Cómo hacerlo" (la tip card se oculta)
  await page.getByText('Cómo hacerlo').click();
  await page.waitForTimeout(700);
  await expect(page.getByText('Consejo CHISPA')).toHaveCount(0);

  // Las 4 quedaron persistidas en chispa_store
  const prefs1 = await readPrefs(page);
  expect(prefs1?.explainerRate).toBe(1.25);
  expect(prefs1?.explainerSlow).toBe(true);
  expect(prefs1?.explainerAutoplay).toBe(false);
  expect(prefs1?.explainerOpenSection).toBe('howTo');

  // ─── FASE 2: REFRESH y verificación ───
  await page.reload();
  await page.waitForTimeout(2000);

  // Re-abrir el explainer (tras reload el panel se resetea a cerrado)
  await expect(page.getByRole('button', { name: '¿Cómo se hace?' })).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: '¿Cómo se hace?' }).click();
  await page.waitForTimeout(800);

  // Los 4 prefs siguen en el store tras el refresh (antes de tocar la UI de nuevo)
  const prefs2 = await readPrefs(page);
  expect(prefs2?.explainerRate).toBe(1.25);
  expect(prefs2?.explainerSlow).toBe(true);
  expect(prefs2?.explainerAutoplay).toBe(false);
  expect(prefs2?.explainerOpenSection).toBe('howTo');

  // 2) Cámara lenta recordada: presionada
  await expect(page.getByLabel('Cámara lenta')).toHaveAttribute('aria-pressed', 'true');

  // 3) Autoplay recordado: pausado (no se reproduce sola)
  await expect(page.getByLabel('Reproducir animación')).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel('Pausar animación')).toHaveCount(0);

  // 4) Sección recordada: "Cómo hacerlo" abierta sin clicar → pasos visibles y tip oculta
  await expect(page.locator('ol li').first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Consejo CHISPA')).toHaveCount(0);

  // 1) Velocidad recordada: el chip solo vive en la tip card, que queda oculta
  //    mientras howTo está abierto → colapsar "Cómo hacerlo" la revela
  await page.getByText('Cómo hacerlo').click();
  await page.waitForTimeout(700);
  await expect(page.getByText('Consejo CHISPA')).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel('Velocidad de lectura').first()).toHaveText('1.25×');
});
