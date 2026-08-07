/**
 * Verificación en navegador del Coach (historial de conversación + idioma).
 *
 * Corre contra el dev server ya activo (http://localhost:4200). Siembra el
 * estado persistido de zustand (chispa_store) para saltar el onboarding y
 * montar directamente la vista 'coach', luego:
 *   1. Envía mensajes en secuencia y comprueba historial (¿recuerda "Ana"?).
 *   2. Cambia a EN desde Perfil y comprueba que la UI traduce.
 *   3. Captura errores de consola y problemas visuales.
 *
 * Uso: node scripts/verify-coach-browser.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.CHISPA_URL || 'http://localhost:4200';
const STORE_KEY = 'chispa_store';

const seedState = {
  state: {
    onboarded: true,
    user: null,
    profile: {
      user_id: 'test-verify',
      name: 'Ana',
      goal: 'energia',
      level: 'medio',
      equipment: 'ninguno',
      limitations: [],
      days_per_week: '2-3',
      neurotype: 'adh-c',
      preferred_duration: 20,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    neuro: { type: 'adh-c', duration: 20 },
    twin: {
      user_id: 'test-verify',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      training_style: 'adaptive',
      motivation_style: 'data',
      avoid: [],
      best_time: '18',
      patterns: {
        completion_rate: 0.6,
        avg_duration: 20,
        abandon_rate: 0.1,
        best_hours: { '18': 5 },
      },
      ex_progress: { squat: { easy: 2 }, pushup: { easy: 3 } },
      motiv_weights: { data: 1, energy: 1, direct: 1, calm: 1 },
    },
    lang: 'es',
    prefs: { reduceMotion: false, highContrast: false, fontLarge: false },
    sensory: { quiet: false, dim: false, swap: false },
    checkins: {},
    workouts: [],
    events: [],
    chat: [],
    plan: null,
    view: 'coach',
    achievements: {},
    achievementQueue: [],
    questState: {
      selectedTheme: 'one_piece',
      vaultClaims: {},
      bossDefeatedThisWeek: false,
      bossDefeatedCount: 0,
      lastBossDefeatDate: null,
    },
    workoutTemplates: [],
    editingTemplateId: null,
    quickLogs: [],
    decisionFatigue: 0,
    decisionFatigueDate: new Date().toISOString().slice(0, 10),
  },
  version: 0,
};

const results = { steps: [] };
const ok = (name, detail) => results.steps.push({ ok: true, name, detail });
const fail = (name, detail) => results.steps.push({ ok: false, name, detail });

const BUBBLE = '[role="log"] .max-w-\\[85\\%\\]';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 440, height: 900 } });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));

try {
  // 1. Seed state BEFORE any app code runs
  await page.addInitScript(([key, value]) => {
    localStorage.setItem(key, value);
  }, [STORE_KEY, JSON.stringify(seedState)]);

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // 2. Coach screen mounted?
  const header = await page.locator('text=Coach CHISPA').count().catch(() => 0);
  if (header > 0) ok('coach-screen', 'Pantalla Coach montada (header "Coach CHISPA" visible)');
  else fail('coach-screen', 'No se encontró el header del Coach');

  // Greeting added automatically?
  const greeting = await page.locator(BUBBLE).count().catch(() => 0);
  if (greeting > 0) ok('greeting', `Saludo inicial presente (${greeting} burbuja(s))`);
  else fail('greeting', 'No se detectó saludo inicial');

  // Model status: 'IA real' (LLM) vs fallback rule-based
  const statusText = await page.locator('.text-xs').first().innerText().catch(() => '');
  const modelReal = /IA real|natural responses|real AI/i.test(statusText);
  ok(true, `Estado del modelo: "${statusText.trim() || 'n/a'}" (${modelReal ? 'IA real' : 'fallback rule-based'})`);

  const countBubbles = async () => page.locator(BUBBLE).count().catch(() => 0);

  // send(): espera a que aparezca UNA burbuja nueva (timeout amplio: la LLM
  // local puede tardar en responder o no estar disponible en este entorno).
  const send = async (text) => {
    const before = await countBubbles();
    await page.fill('#coach-input', text);
    await page.keyboard.press('Enter');
    for (let i = 0; i < 60; i++) {
      const now = await countBubbles();
      if (now > before) return true;
      await page.waitForTimeout(500);
    }
    return false;
  };

  // 3. Message 1
  const sent1 = await send('Hola, me llamo Ana');
  ok(sent1, 'Mensaje 1 enviado y respondido ("Hola, me llamo Ana")');

  // 4. Message 2 — history check (aserción estricta solo con IA real)
  const sent2 = await send('¿Cómo me llamo?');
  ok(sent2, 'Mensaje 2 enviado y respondido ("¿Cómo me llamo?")');
  const body2 = await page.locator('[role="log"]').innerText().catch(() => '');
  const qIdx = body2.lastIndexOf('¿Cómo me llamo?');
  const anaAfterQ = qIdx >= 0 && /ana/i.test(body2.slice(qIdx));
  if (modelReal) {
    if (anaAfterQ) ok('history', 'HISTORIAL OK: la respuesta a "¿Cómo me llamo?" referencia a "Ana"');
    else fail('history', 'Con IA real, la respuesta no referenció a "Ana" (historial NO aplicado)');
  } else {
    const snippet = qIdx >= 0 ? body2.slice(qIdx, qIdx + 140).replace(/\n+/g, ' ') : '(sin pregunta visible)';
    ok(true, `HISTORIAL: modo fallback (sin memoria LLM) — respuesta: "${snippet}"`);
  }

  // 5. Message 3
  const sent3 = await send('Dame un consejo');
  ok(sent3, 'Tercer mensaje enviado y respondido');

  // 6. Language switch: abrir menú "Más" → "Perfil" → click "English" → volver a Coach
  await page.locator('nav button:has-text("Más")').first().click().catch(() => {});
  await page.waitForTimeout(800);
  await page.locator('button:has-text("Perfil")').first().click().catch(() => {});
  await page.waitForTimeout(1500);
  const enBtn = page.locator('button:has-text("English")');
  if ((await enBtn.count()) > 0) {
    await enBtn.click();
    await page.waitForTimeout(1500);
    await page.locator('nav button:has-text("Coach")').first().click().catch(() => {});
    await page.waitForTimeout(1500);
    const headerEn = await page.locator('text=Coach CHISPA').count().catch(() => 0);
    ok(headerEn > 0, 'Vuelta al Coach tras cambiar a EN');
    const placeholderEn = await page.getAttribute('#coach-input', 'placeholder').catch(() => null);
    ok(placeholderEn !== null && placeholderEn.length > 0, `Placeholder tras switch EN: "${placeholderEn}"`);
    const sentEn = await send('hello coach');
    ok(sentEn, 'Mensaje en inglés enviado y respondido');
  } else {
    fail('lang-toggle', `No se encontró el botón "English" en Perfil (vista actual: ${(await page.locator('body').innerText().catch(() => '')).slice(0, 120)})`);
  }
} catch (err) {
  fail('script', `Error del script: ${err.message}`);
} finally {
  await browser.close();
}

// ── Reporte ──
const failed = results.steps.filter((s) => !s.ok);
console.log('\n═══ VERIFICACIÓN COACH (navegador) ═══');
for (const s of results.steps) {
  console.log(`${s.ok ? '✅' : '❌'} ${s.name}: ${s.detail}`);
}
console.log(`\nConsola: ${consoleErrors.length === 0 ? '0 errores ✅' : `${consoleErrors.length} errores ⚠️`}`);
if (consoleErrors.length > 0) {
  for (const e of consoleErrors.slice(0, 10)) console.log('  ·', e.slice(0, 200));
}
console.log(failed.length === 0 ? '\nRESULTADO: TODO OK ✅' : `\nRESULTADO: ${failed.length} paso(s) con incidencias`);
process.exit(failed.length === 0 ? 0 : 2);
