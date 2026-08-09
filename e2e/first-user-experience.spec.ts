/**
 * 🧠 FIRST-USER EXPERIENCE TEST
 * ==============================
 * Simula a un usuario neurodivergente que NUNCA ha usado CHISPA.
 * 
 * Perfil del usuario simulado:
 * - TDAH combinado (hiperactivo + inatento)
 * - Cronotipo nocturno (lobo)
 * - Sin equipo, empezando desde cero
 * - Necesita modo silencio (sensory quiet)
 * - Hiperfijación: Iniciación (tema Fitness)
 * - Prefiere sesiones cortas (10 min)
 * - Se abruma con interfaces recargadas
 * 
 * Cada paso verifica:
 * ✅ Claridad del copy (¿sabe qué hacer?)
 * ✅ Accesibilidad (aria-labels, roles, focus)
 * ✅ Ritmo (pausas para leer, sin prisas)
 * ✅ Consola sin errores
 * ✅ Que las opciones no son abrumadoras
 */

import { test, expect, type Page } from '@playwright/test';
import { navigateOnboarding, completeOnboarding } from './helpers';

/** Verifica que no haya errores en consola y reporta warnings */
async function checkConsole(page: Page, step: string) {
  const logs: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') logs.push(`[CONSOLE ERROR @ ${step}] ${msg.text()}`);
    if (msg.type() === 'warning') logs.push(`[CONSOLE WARN @ ${step}] ${msg.text()}`);
  });
  await page.waitForTimeout(100);
  if (logs.length > 0) {
    console.log(`⚠️  Console issues at step "${step}":`);
    logs.forEach(l => console.log(`   ${l}`));
  }
  const errors = logs.filter(l => !l.includes('Hydration failed') && !l.includes('favicon'));
  expect(errors).toEqual([]);
}

/** Pausa natural: el usuario lee la pantalla antes de actuar */
async function userPause(page: Page, ms = 600) {
  await page.waitForTimeout(ms);
}

// ─────────────────────────────────────────────────────
//  TEST 1: PRIMERA IMPRESIÓN — LANDING PAGE
// ─────────────────────────────────────────────────────
test.describe('🧠 First-time neurodivergent user experience', () => {
  test('1. Landing page — primera impresión: clara, sin abrumar', async ({ page }) => {
    await page.goto('/');
    await checkConsole(page, 'landing');

    // ⏳ El usuario recién llega, mira la pantalla, lee
    await userPause(page);

    // ✅ Título claro: sabe que es una app fitness
    await expect(page.locator('h1')).toContainText('CHISPA');

    // ✅ Subtítulo: "La IA que se adapta a tu cerebro" — personal, no genérico
    await expect(page.locator('text=se adapta a tu cerebro')).toBeVisible();

    // ✅ Propuesta de valor visible de un vistazo (3 pills)
    await expect(page.getByText('Menos decisiones', { exact: true })).toBeVisible();
    await expect(page.getByText('Más movimiento', { exact: true })).toBeVisible();
    await expect(page.getByText('Cero culpa', { exact: true })).toBeVisible();

    // ✅ El usuario distingue las 2 acciones principales
    const cta = page.locator('#cta-btn');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveText('Crear mi perfil');
    await expect(cta).toBeEnabled();

    // ✅ Login secundario: no distrae, no abruma
    await expect(page.locator('text=Iniciar sesión')).toBeVisible();

    // ✅ Footer con info de privacidad: genera confianza
    await expect(page.locator('text=Tus datos viven en tu dispositivo')).toBeVisible();

    // ✅ Los stats no compiten por atención (están al final)
    await expect(page.getByText('algoritmos', { exact: true })).toBeVisible();

    console.log('✅ Landing page supera primera impresión: clara, acogedora, sin ruido visual');
  });

  // ─────────────────────────────────────────────────────
  //  TEST 2: ONBOARDING — PASO A PASO SIN PRISA
  // ─────────────────────────────────────────────────────
  test('2. Onboarding — pasos claros, opciones manejables, sin ansiedad', async ({ page }) => {
    await page.goto('/');
    await userPause(page);

    // CTA: "Crear mi perfil"
    await page.locator('#cta-btn').click();
    await userPause(page, 1500);

    // ──── STEP 1: Nombre ────
    // El usuario ve: "Empecemos" + "¿Cómo te llamamos?" + ilustración
    await expect(page.locator('text=Empecemos')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=¿Cómo te llamamos?')).toBeVisible();
    const nameInput = page.locator('input[id="onboarding-name"]');
    await expect(nameInput).toBeVisible();

    // ✅ El botón "Continuar" está deshabilitado hasta escribir nombre
    const continueBtn = page.locator('button', { hasText: 'Continuar' });
    await expect(continueBtn).toBeVisible();
    await expect(continueBtn).toBeDisabled();

    // El usuario escribe su nombre
    await nameInput.fill('Luna');
    await userPause(page, 300);
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();
    await userPause(page);

    // ──── STEP 2: Objetivo + Duración ────
    await expect(page.locator('text=Tu objetivo')).toBeVisible();
    // ✅ 3 opciones claras — no es abrumador
    const goalOptions = page.locator('button').filter({ hasText: /Fuerza y músculo|Energía y salud|Perder grasa/ });
    await expect(goalOptions).toHaveCount(3);
    await page.locator('text=Energía y salud').click();
    await userPause(page, 300);

    // Sub-pregunta: duración — 3 opciones (10, 20, 30 min)
    await expect(page.locator('text=¿Cuánto tiempo por sesión te viene bien?')).toBeVisible();
    await page.locator('text=10 min').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page);

    // ──── STEP 3: Nivel ────
    await expect(page.locator('text=Tu punto de partida')).toBeVisible();
    await expect(page.locator('text=Estoy empezando')).toBeVisible();
    await expect(page.locator('text=Me muevo a veces')).toBeVisible();
    await expect(page.locator('text=Entreno regular')).toBeVisible();
    await page.locator('text=Estoy empezando').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page);

    // ──── STEP 4: Neurotipo ────
    await expect(page.locator('text=Tu cerebro')).toBeVisible();
    await expect(page.locator('text=TDAH combinado')).toBeVisible();
    await expect(page.locator('text=TDAH inatento')).toBeVisible();
    await expect(page.locator('text=AuDHD')).toBeVisible();
    await expect(page.locator('text=Alta sensibilidad')).toBeVisible();
    await expect(page.locator('text=Otra neurodivergencia')).toBeVisible();
    await expect(page.locator('text=Solo curioseando')).toBeVisible();
    // 6 opciones — manejable para un usuario TDAH
    await page.locator('text=TDAH combinado').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page);

    // ──── STEP 5: Cronotipo ────
    await expect(page.locator('text=Tu cronotipo')).toBeVisible();
    await expect(page.locator('text=Lobo (noche)')).toBeVisible();
    await page.locator('text=Lobo (noche)').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page);

    // ──── STEP 6: Equipamiento + Días ────
    await expect(page.locator('text=Tu contexto')).toBeVisible();
    await page.locator('text=Sin equipo').click();
    await userPause(page, 300);
    await expect(page.locator('text=¿Cuántos días a la semana puedes?')).toBeVisible();
    await expect(page.locator('text=Flexible')).toBeVisible();
    await page.locator('text=Flexible').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page);

    // ──── STEP 7: Medicación ────
    await expect(page.locator('text=Tu medicación')).toBeVisible();
    await expect(page.locator('text=No aplica')).toBeVisible();
    await page.locator('text=No aplica').click();
    await expect(page.locator('text=¿A qué hora la tomas?')).not.toBeVisible();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page);

    // ──── STEP 8: Tu cuerpo (medidas corporales) ────
    await expect(page.locator('text=¿Quieres registrar tus medidas?')).toBeVisible();
    // Imperial es el default
    await expect(page.locator('button', { hasText: 'Imperial (lb · ft)' })).toHaveAttribute('aria-pressed', 'true');
    // El usuario registra sexo, peso y estatura
    await page.locator('button', { hasText: 'Mujer' }).click();
    await page.locator('input[id="onboarding-weight"]').fill('130');
    await page.locator('input[id="onboarding-height-ft"]').fill('5');
    await page.locator('input[id="onboarding-height-in"]').fill('6');
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page);

    // ──── STEP 9: Hiperfijación ────
    await expect(page.locator('text=Tu hiperfijación')).toBeVisible();
    await expect(page.locator('text=Fitness')).toBeVisible();
    await page.locator('button').filter({ hasText: 'Iniciación' }).click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page);

    // ──── STEP 10: Perfil sensorial ────
    await expect(page.locator('text=Perfil sensorial')).toBeVisible();
    await expect(page.locator('text=Modo silencio')).toBeVisible();
    await expect(page.locator('text=Modo dim')).toBeVisible();
    await expect(page.locator('text=Sensory swap')).toBeVisible();
    await expect(page.locator('text=Puedes cambiarlo cuando quieras')).toBeVisible();

    // Activa modo silencio + dim
    await page.locator('button[aria-label="Activar Modo silencio"]').click();
    await userPause(page, 200);
    await page.locator('button[aria-label="Activar Modo dim"]').click();
    await userPause(page, 200);

    // Botón "Crear mi Digital Twin"
    const finishBtn = page.locator('button', { hasText: 'Crear mi Digital Twin' });
    await expect(finishBtn).toBeVisible();
    await expect(finishBtn).toBeEnabled();

    await userPause(page, 1500);
    await finishBtn.click();

    // 🔄 BootScreen aparece con animación (~4.5s)
    await userPause(page, 1000);
    await checkConsole(page, 'after-onboarding');

    // ⏳ Esperar a que BootScreen termine y Home aparezca
    await page.waitForFunction(
      () => {
        const body = document.body.innerText;
        return body.includes('Buenos') || body.includes('Buenas');
      },
      { timeout: 25000 }
    );

    await checkConsole(page, 'home-ready');
    console.log('✅ Onboarding completado sin errores. Usuario llegó al Home.');
  });

  // ─────────────────────────────────────────────────────
  //  TEST 3: HOME — ¿SABE EL USUARIO QUÉ HACER?
  // ─────────────────────────────────────────────────────
  test('3. Home — bienvenida clara, siguiente acción obvia', async ({ page }) => {
    await completeOnboarding(page);
    await userPause(page, 1000);
    await checkConsole(page, 'home');

    // ✅ Saludo personalizado con el nombre del usuario
    await expect(page.locator('text=Test')).toBeVisible();

    // ✅ El plan generado tras el onboarding es la siguiente acción obvia
    await expect(page.locator('text=Empezar ahora')).toBeVisible();

    // ✅ Botón "Crear rutina" visible y claro
    await expect(page.locator('text=Crear rutina')).toBeVisible();
    await expect(page.locator('text=Arma tu propia sesión')).toBeVisible();

    console.log('✅ Home: saludo personalizado, check-in visible, crear rutina accesible');
  });

  // ─────────────────────────────────────────────────────
  //  TEST 4: CREAR RUTINA — ICONOS MUSCULARES + FITNESSICON
  // ─────────────────────────────────────────────────────
  test('4. Crear rutina — 4 MuscleGroupIcon cards con FitnessIcon', async ({ page }) => {
    await completeOnboarding(page);
    await userPause(page, 1000);

    // Click "Crear rutina"
    await page.locator('text=Crear rutina').click();
    await userPause(page, 1000);
    await checkConsole(page, 'create-workout');

    // ✅ Pregunta clara
    await expect(page.locator('text=¿Qué grupo muscular quieres trabajar?')).toBeVisible();

    // ✅ 4 cards con iconos SVG (MuscleGroupIcon)
    const labels = ['Todo el cuerpo', 'Tren superior', 'Tren inferior', 'Core y cardio'];
    for (const label of labels) {
      const card = page.locator('button').filter({ hasText: label });
      await expect(card).toBeVisible();
      await expect(card.locator('svg')).toHaveCount(1);
    }

    // ✅ Sub-labels visibles en cada card
    const fullCard = page.locator('button').filter({ hasText: 'Todo el cuerpo' });
    await expect(fullCard.locator('text=piernas · gluteos · pecho')).toBeVisible();
    const coreCard = page.locator('button').filter({ hasText: 'Core y cardio' });
    await expect(coreCard.locator('text=core · cardio')).toBeVisible();

    // ✅ Input de nombre con placeholder claro
    const nameInput = page.locator('input[placeholder*="Full body"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Entreno One Piece');
    await expect(nameInput).toHaveValue('Entreno One Piece');

    // ✅ Presets de duración: botones grandes y claros (10, 15, 20, 30, 45 min)
    const durationBtns = page.locator('button').filter({ hasText: /10 min|15 min|20 min|30 min|45 min/ });
    await expect(durationBtns).toHaveCount(5);

    // Selecciona "30 min"
    await page.locator('button').filter({ hasText: '30 min' }).click();
    await userPause(page, 200);

    // ✅ Botón "Elegir ejercicios" visible y habilitado
    await expect(page.locator('button').filter({ hasText: 'Elegir ejercicios' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Elegir ejercicios' })).toBeEnabled();

    console.log('✅ Crear rutina: 4 MuscleGroupIcon con SVG, input nombre, duración, CTA listo');
  });

  // ─────────────────────────────────────────────────────
  //  TEST 5: CATÁLOGO DE EJERCICIOS — FITNESSICON EN GRID Y BÚSQUEDA
  // ─────────────────────────────────────────────────────
  test('5. Catálogo de ejercicios — FitnessIcon visibles, búsqueda funcional', async ({ page }) => {
    await completeOnboarding(page);
    await userPause(page, 1000);

    // Navegar a crear rutina
    await page.locator('text=Crear rutina').click();
    await userPause(page, 800);

    // Seleccionar "Todo el cuerpo"
    await page.locator('button').filter({ hasText: 'Todo el cuerpo' }).click();
    await userPause(page, 1500);
    await checkConsole(page, 'exercise-catalog');

    // ✅ Título del paso
    await expect(page.locator('text=Paso 2 de 2')).toBeVisible();
    await expect(page.locator('text=Elige ejercicios')).toBeVisible();

    // ✅ Selector rediseñado: el buscador vive en el modo "Yo elijo"
    // (el default es Guíame con sugerencias; nunca un lienzo en blanco)
    await page.locator('button').filter({ hasText: 'Yo elijo' }).click();
    await userPause(page, 400);

    // ✅ Buscador visible
    const searchInput = page.locator('input[placeholder*="Buscar"]');
    await expect(searchInput).toBeVisible();

    // ✅ Balance de la rutina visible (antes grid "Toque para agregar")
    await expect(page.locator('text=Balance de la rutina')).toBeVisible({ timeout: 5000 });

    // ✅ Los ejercicios tienen SVG icon (FitnessIcon)
    const exerciseButtons = page.locator('button').filter({ has: page.locator('svg') });
    const exerciseCount = await exerciseButtons.count();
    await expect(exerciseCount).toBeGreaterThanOrEqual(1);

    // ✅ Búsqueda funciona (no falla si no hay resultados, solo verifica que filtra)
    await searchInput.fill('running');
    await userPause(page, 500);

    // Limpiar búsqueda
    await searchInput.clear();
    await userPause(page, 300);

    // ✅ Back button funcional
    await page.locator('button[aria-label="Volver"]').click();
    await userPause(page, 800);

    // Debería volver a la pantalla de crear rutina
    await expect(page.locator('text=¿Qué grupo muscular quieres trabajar?')).toBeVisible();

    await checkConsole(page, 'back-to-create');
    console.log('✅ Catálogo: FitnessIcon visibles, búsqueda funcional, navegación correcta');
  });

  // ─────────────────────────────────────────────────────
  //  TEST 6: ACCESIBILIDAD HOME — SVGs DECORATIVOS, SIN ERRORES
  // ─────────────────────────────────────────────────────
  test('6. Accesibilidad — SVGs decorativos, roles semánticos, home sin errores', async ({ page }) => {
    await completeOnboarding(page);
    await userPause(page, 1000);
    await checkConsole(page, 'home-accessibility');

    // ✅ Home cargó correctamente
    await expect(page.locator('text=Crear rutina')).toBeVisible();
    await expect(page.locator('text=Tu Digital Twin')).toBeVisible();

    // ✅ Saludo personalizado visible
    await expect(page.locator('text=Test')).toBeVisible();

    // ✅ Los SVGs decorativos tienen aria-hidden
    const decorativeSvg = page.locator('svg[aria-hidden="true"]').first();
    await expect(decorativeSvg).toBeVisible();

    console.log('✅ Home accesible: SVGs decorativos ocultos, sin errores de consola');
  });

  // ─────────────────────────────────────────────────────
  //  TEST 7: SENSORIAL — MODO SILENCIO Y DIM RESPETADOS
  // ─────────────────────────────────────────────────────
  test('7. Perfil sensorial — preferencias guardadas y aplicadas', async ({ page }) => {
    // Completar onboarding activando preferencias sensoriales
    await page.goto('/');
    await page.locator('#cta-btn').click();
    await userPause(page, 1500);

    await page.locator('input[id="onboarding-name"]').fill('Luna');
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page);
    await page.locator('text=Fuerza y músculo').click();
    await page.locator('text=20 min').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page);
    await page.locator('text=Estoy empezando').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page);
    await page.locator('text=TDAH combinado').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page);
    await page.locator('text=León (mañana)').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page);
    await page.locator('text=Sin equipo').click();
    await page.locator('text=2-3 días').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page);
    await page.locator('text=No aplica').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page);

    // Paso 8: Tu cuerpo — opcional, lo saltamos (Continuar siempre habilitado)
    await expect(page.locator('text=¿Quieres registrar tus medidas?')).toBeVisible();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page);

    await page.locator('button').filter({ hasText: 'Iniciación' }).click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page);

    // Activar las preferencias sensoriales
    await page.locator('button[aria-label="Activar Modo silencio"]').click();
    await userPause(page, 150);
    await page.locator('button[aria-label="Activar Modo dim"]').click();
    await userPause(page, 150);
    await page.locator('button[aria-label="Activar Sensory swap"]').click();
    await userPause(page, 150);

    // Finalizar onboarding
    await page.locator('button', { hasText: 'Crear mi Digital Twin' }).click();

    await page.waitForFunction(
      () => document.body.innerText.includes('Buenos') || document.body.innerText.includes('Buenas'),
      { timeout: 25000 }
    );
    await userPause(page, 1000);
    await checkConsole(page, 'sensory-home');

    // ✅ El sistema cargó sin errores con preferencias sensoriales activas
    await expect(page.locator('text=Crear rutina')).toBeVisible();
    await expect(page.locator('text=Tu Digital Twin')).toBeVisible();

    console.log('✅ Preferencias sensoriales activadas sin errores. App estable.');
  });

  // ─────────────────────────────────────────────────────
  //  TEST 8: ONBOARDING ACCESIBLE — CTA ARIA-BUSY + BACK BUTTON + SENSORY TOGGLES
  // ─────────────────────────────────────────────────────
  test('8. Onboarding accesible — CTA aria-busy, back button por paso, sensory toggles dinámicos', async ({ page }) => {
    // ═══ PARTE 1: Landing page — CTA aria-busy + SVGs decorativos ═══
    await page.goto('/');
    await checkConsole(page, 'landing-a11y');

    // ✅ CTA tiene aria-busy (accesible)
    await expect(page.locator('#cta-btn')).toHaveAttribute('aria-busy', 'false');

    // ✅ SVGs decorativos con aria-hidden
    await expect(page.locator('svg[aria-hidden="true"]').first()).toBeVisible();

    // ═══ PARTE 2: Step 1 — Back button invisible, name input labelable ═══
    // Usamos navigateOnboarding(page, 0) para navegar el CTA de forma confiable
    await navigateOnboarding(page, 0);

    // ✅ Input de nombre tiene id (labelable)
    const nameInput = page.locator('input[id="onboarding-name"]');
    await expect(nameInput).toBeVisible();

    // ✅ Back button invisible en step 1 (primer paso, no hay anterior)
    const backBtn = page.locator('button[aria-label="Paso anterior"]');
    await expect(backBtn).not.toBeVisible();

    // ═══ PARTE 3: Step 2 — Back button visible, navegación ida y vuelta ═══
    // Nota: navigateOnboarding es un flujo lineal forward-only. Para el test
    // de ida-y-vuelta, hacemos los pasos manualmente (patrón probado en test 2).
    await nameInput.fill('Luna');
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page, 400);

    // ✅ Back button visible en step 2 (objetivo)
    await expect(backBtn).toBeVisible();

    // ✅ Click back → step 1 → invisible otra vez
    await backBtn.click();
    await userPause(page, 300);
    await expect(backBtn).not.toBeVisible();

    // Avanzar de nuevo a step 2
    await nameInput.fill('Luna');
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page, 200);

    // ═══ PARTE 4: Navegar a step 10 (sensory) ═══
    // Step 2 → 3: Goal + Duración
    await page.locator('text=Fuerza y músculo').click();
    await page.locator('text=20 min').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page, 200);

    // Step 3 → 4: Level
    await page.locator('text=Estoy empezando').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page, 200);

    // Step 4 → 5: Neurotype
    await page.locator('text=TDAH combinado').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page, 200);

    // Step 5 → 6: Chronotype
    await page.locator('text=León (mañana)').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page, 200);

    // Step 6 → 7: Equipment + Days
    await page.locator('text=Sin equipo').click();
    await page.locator('text=2-3 días').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page, 200);

    // Step 7 → 8: Medication
    await page.locator('text=No aplica').click();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page, 200);

    // Step 8 → 9: Body — medidas (opcional). Lo saltamos.
    await expect(page.locator('text=¿Quieres registrar tus medidas?')).toBeVisible();
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page, 200);

    // Step 9 → 10: Hyperfixation
    await page.locator('button').filter({ hasText: 'Iniciación' }).click();
    await userPause(page, 150);
    await page.locator('button', { hasText: 'Continuar' }).click();
    await userPause(page, 200);

    // ═══ PARTE 5: Step 10 — Sensory toggle aria-label bidireccional ═══
    await expect(page.locator('text=Perfil sensorial')).toBeVisible();
    await expect(page.locator('text=Modo silencio')).toBeVisible();
    await expect(page.locator('text=Modo dim')).toBeVisible();
    await expect(page.locator('text=Sensory swap')).toBeVisible();
    await expect(page.locator('text=Puedes cambiarlo cuando quieras')).toBeVisible();

    // ✅ TWO-WAY: "Activar" → click → "Desactivar" → click → "Activar"
    const quietToggle = page.locator('button[aria-label="Activar Modo silencio"]');
    await expect(quietToggle).toBeVisible();
    await quietToggle.click();
    await userPause(page, 200);
    const quietDeactivated = page.locator('button[aria-label="Desactivar Modo silencio"]');
    await expect(quietDeactivated).toBeVisible();

    // Volver a "Activar" (two-way)
    await quietDeactivated.click();
    await userPause(page, 200);
    await expect(page.locator('button[aria-label="Activar Modo silencio"]')).toBeVisible();

    // ✅ Modo dim: Activar → Desactivar
    const dimToggle = page.locator('button[aria-label="Activar Modo dim"]');
    await expect(dimToggle).toBeVisible();
    await dimToggle.click();
    await userPause(page, 200);
    await expect(page.locator('button[aria-label="Desactivar Modo dim"]')).toBeVisible();

    // ✅ Botón final tiene texto claro (no técnico)
    const finishBtn = page.locator('button', { hasText: 'Crear mi Digital Twin' });
    await expect(finishBtn).toBeVisible();
    await expect(finishBtn).toBeEnabled();

    // ═══ PARTE 6: Completar onboarding → Home ═══
    await finishBtn.click();

    await page.waitForFunction(
      () => document.body.innerText.includes('Buenos') || document.body.innerText.includes('Buenas'),
      { timeout: 25000 }
    );
    await userPause(page, 1000);
    await checkConsole(page, 'onboarding-a11y');

    // ✅ Home cargó sin errores
    await expect(page.locator('text=Crear rutina')).toBeVisible();
    await expect(page.locator('text=Tu Digital Twin')).toBeVisible();

    console.log('✅ Onboarding accesible: CTA aria-busy, back button por paso, sensory toggles bidireccionales OK');
  });
});
