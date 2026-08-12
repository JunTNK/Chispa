/**
 * e2e · ROUND-TRIP REAL CON SUPABASE
 * ==================================
 * Verifica el ciclo completo de persistencia contra una base Supabase real:
 *
 *   1. Digital Twin:  completar sesión → push → recargar → pull → el twin conserva hard/last_date
 *   2. Feed cooperativo: quick-log con coop activo → push (community_posts) →
 *      otro dispositivo → pull → la chispa propia vuelve al feed
 *
 * Requisitos (si no se cumplen, el test salta con un mensaje claro, no falla):
 *   1. Credenciales reales en .env.local o process.env (NEXT_PUBLIC_SUPABASE_URL,
 *      SUPABASE_SERVICE_ROLE_KEY). process.env gana: permite apuntar a un Supabase
 *      local (`supabase start`) para validar sin tocar el proyecto de producción.
 *   2. Esquema reconciliado: ejecutar `supabase/run-all-migrations.sql` en el
 *      SQL Editor del dashboard (crea neuro_profiles/quest_states/achievements/
 *      leaderboard y renombra ex_progress→exercise_progress, avoid→avoid_patterns,
 *      sleep→sleep_hours; añade lang, best_hours, preferred_duration, confidence).
 *   3. Migración 015 (community_posts) para el test del feed cooperativo.
 *
 * Cada test crea un usuario desechable vía admin API (service role), completa el
 * flujo real por la UI, comprueba la fila en la DB real, simula otro dispositivo
 * (borra el dato del store local), recarga y verifica que el pull lo restaura.
 * Al final elimina el usuario (cascade limpia todo).
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { openExtraMenu, navigateToNavScreen, navigateFromHome } from './helpers';

/* ─── Credenciales reales (Playwright no carga .env.local por sí solo) ─── */

function loadEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};
  try {
    const raw = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    /* no .env.local → el test salta */
  }
  // process.env gana sobre .env.local: permite apuntar a un Supabase local
  // (o CI) sin tocar el archivo de desarrollo.
  return { ...env, ...process.env };
}

const env = loadEnv();
const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SB_SERVICE = env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/* ─── Usuario desechable ─── */
// Sufijo por test: evita colisión de email entre los dos tests (worker compartido)
let emailSuffix = 'base';
// Se genera UNA vez por test (el mismo email para createUser, seed y login)
let EMAIL = `e2e-roundtrip-${Date.now()}-${emailSuffix}@chispa.app`;
const PASSWORD = 'roundtrip123!';
let userId: string | null = null;

/* ─── Helpers admin (service role) ─── */

async function adminFetch(path: string, init: RequestInit = {}) {
  return fetch(`${SB_URL}${path}`, {
    ...init,
    headers: {
      apikey: SB_SERVICE,
      Authorization: `Bearer ${SB_SERVICE}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

/** Preflight: ¿esquema reconciliado? Comprueba tablas 003-008 + columna exercise_progress */
async function schemaReady(): Promise<boolean> {
  try {
    // Tablas que el pull consulta (004, 005, 003, 006): deben existir
    for (const table of ['quest_states', 'leaderboard', 'user_achievements', 'neuro_profiles']) {
      const res = await adminFetch(`/rest/v1/${table}?select=user_id&limit=1`);
      if (!res.ok) return false;
    }
    // digital_twins debe exponer exercise_progress (008) — no ex_progress
    const probe = await adminFetch(
      '/rest/v1/digital_twins?user_id=eq.00000000-0000-0000-0000-000000000000',
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ exercise_progress: {} }),
      }
    );
    return probe.status === 204; // 400 → columna inexistente → esquema no aplicado
  } catch {
    return false;
  }
}

/** Preflight del feed cooperativo: ¿la migración 015 (community_posts) está aplicada? */
async function communityPostsReady(): Promise<boolean> {
  try {
    const res = await adminFetch('/rest/v1/community_posts?select=id&limit=1');
    return res.ok; // 404/PGRST205 → tabla aún no creada → el test de chispas salta
  } catch {
    return false;
  }
}

async function seedRow(table: string, row: Record<string, unknown>) {
  const res = await adminFetch(`/rest/v1/${table}`, {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });
  expect(res.status, `seed ${table}`).toBe(201);
}

async function createUser(): Promise<string> {
  const res = await adminFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true }),
  });
  expect(res.status, 'admin create user').toBe(200);
  const body = await res.json();
  expect(body?.id).toBeTruthy();
  return body.id as string;
}

async function deleteUser(id: string) {
  try {
    await adminFetch(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
  } catch {
    /* best-effort cleanup */
  }
}

/** Lee exercise_progress del twin real en la DB */
async function getTwinProgress(uid: string): Promise<Record<string, any>> {
  const res = await adminFetch(
    `/rest/v1/digital_twins?user_id=eq.${uid}&select=exercise_progress`
  );
  if (!res.ok) return {};
  const rows = (await res.json()) as { exercise_progress: Record<string, any> | null }[];
  return rows?.[0]?.exercise_progress ?? {};
}

const EXERCISE_ID = 'Bodyweight_Squat'; // "Sentadilla con peso corporal" (reps, ninguno)

test.describe('Round-trip real con Supabase: twin + feed cooperativo', () => {
  let ready = false;
  let skipReason = '';

  test.beforeAll(async () => {
    if (!SB_URL || !SB_SERVICE) {
      skipReason = 'Faltan NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY en .env.local';
      return;
    }
    ready = await schemaReady();
    if (!ready) {
      const ref = SB_URL.replace(/^https?:\/\//, '').replace(/\.supabase\.co.*$/, '');
      skipReason =
        'Esquema no reconciliado: ejecuta supabase/run-all-migrations.sql en el SQL Editor ' +
        `(https://supabase.com/dashboard/project/${ref}/sql/new) y vuelve a correr.`;
    }
  });

  test('completar sesión → recargar → el twin conserva hard/last_date', async ({ page }) => {
    test.skip(!ready, skipReason || 'Entorno Supabase no disponible');
    test.setTimeout(120_000);

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const t = msg.text();
      // Ruido esperado: imágenes de ejercicios desde CDN externa, favicon, Hydration
      if (t.includes('Hydration failed') || t.includes('favicon')) return;
      if (t.includes('status of 404')) return;
      // 406 = PGRST116 (no rows) del pull en neuro_profiles/quest_states para
      // usuarios nuevos sin filas — esperado, no es un error real.
      if (t.includes('status of 406')) return;
      pageErrors.push(t);
    });

    // Neutraliza el Service Worker de la PWA (rompería reload/page.route)
    await page.addInitScript(() => {
      if ('serviceWorker' in navigator) {
        Object.defineProperty(navigator, 'serviceWorker', {
          value: {
            register: () => Promise.resolve({}),
            getRegistration: () => Promise.resolve(null),
            getRegistrations: () => Promise.resolve([]),
          },
          configurable: true,
        });
      }
    });

    // ── 1. Crear usuario desechable + seed mínimo ──
    emailSuffix = 'twin';
    EMAIL = `e2e-roundtrip-${Date.now()}-${emailSuffix}@chispa.app`;
    userId = await createUser();
    const uid = userId;
    try {
      await seedRow('users', { id: uid, email: EMAIL, name: 'E2E Roundtrip' });
      await seedRow('profiles', {
        user_id: uid,
        goal: 'fuerza',
        level: 'inicio',
        equipment: 'ninguno',
        limitations: [],
        days_per_week: '2-3',
        neurotype: 'adh-c',
        preferred_duration: 20,
        name: 'E2E Roundtrip',
      });
      await seedRow('digital_twins', {
        user_id: uid,
        motivation_style: 'data',
        avoid_patterns: [],
        best_hours: {},
        patterns: { completion_rate: 0.5, avg_duration: 20, abandon_rate: 0.2, best_hours: {} },
        exercise_progress: {},
        lang: 'es',
        preferred_duration: 20,
        confidence: 50,
      });

      // ── 2. Login real por la UI ──
      await page.goto('/');
      await page.getByText('Iniciar sesión').click();
      await page.locator('#login-email').fill(EMAIL);
      await page.locator('#login-password').fill(PASSWORD);
      await page.locator('button', { hasText: 'Entrar' }).click();
      await expect(page.locator('text=Crear rutina')).toBeVisible({ timeout: 20000 });

      // El pull post-login corre en background (signInWithEmail no lo await).
      // SummaryScreen.handleSave hace `if (!profile || !twin) return` — espera
      // a que el twin/perfil sembrado estén aplicados al store antes de empezar.
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              try {
                const raw = localStorage.getItem('chispa_store');
                if (!raw) return false;
                const s = (JSON.parse(raw) as { state?: Record<string, unknown> }).state;
                return !!(s && s.twin && s.profile);
              } catch {
                return false;
              }
            }),
          { timeout: 15000, intervals: [500] }
        )
        .toBe(true);

      // ── 3. Crear rutina: Todo el cuerpo → Yo elijo → Sentadilla → Empezar ──
      await page.locator('text=Crear rutina').click();
      await expect(page.locator('text=¿Qué grupo muscular quieres trabajar?')).toBeVisible();
      await page.locator('button', { hasText: 'Todo el cuerpo' }).click();
      await expect(page.locator('text=Paso 2 de 2')).toBeVisible({ timeout: 10000 });

      await page.locator('button', { hasText: 'Yo elijo' }).click();
      const search = page.locator('input[placeholder*="Buscar"]');
      await expect(search).toBeVisible();
      await search.fill('sentadilla');
      await expect(page.getByRole('button', { name: `Añadir ${'Sentadilla con peso corporal'}` })).toBeVisible({ timeout: 8000 });
      await page.getByRole('button', { name: `Añadir ${'Sentadilla con peso corporal'}` }).click();
      await page.locator('button', { hasText: 'Empezar ahora' }).click();

      // ── 4. Sesión: completar 3 series de la única sentadilla ──
      const setBtn = page.getByRole('button', { name: /Serie hecha|Terminar ejercicio/ });
      await expect(setBtn.first()).toBeVisible({ timeout: 15000 });
      for (let i = 0; i < 3; i++) {
        await setBtn.first().click();
        await page.waitForTimeout(700); // animación de completado (400ms)
      }

      // ── 5. Summary: RPE Duro → Guardar entrenamiento (escribe hard/last_date) ──
      await expect(page.locator('button', { hasText: 'Guardar entrenamiento' })).toBeVisible({ timeout: 15000 });
      await page.locator('button', { hasText: 'Duro' }).first().click();
      await page.locator('button', { hasText: 'Guardar entrenamiento' }).click();

      // ── 6. Verificar en la DB real que el push escribió hard/last_date ──
      const today = new Date().toISOString().slice(0, 10);
      await expect
        .poll(
          async () => {
            const progress = await getTwinProgress(uid);
            const ex = progress[EXERCISE_ID];
            return ex && ex.hard === 1 && ex.last_date === today;
          },
          { timeout: 20000, intervals: [1000] }
        )
        .toBe(true);

      const progressAfterSave = await getTwinProgress(uid);
      expect(progressAfterSave[EXERCISE_ID]).toMatchObject({
        hard: 1,
        last_date: today,
        total: 1,
        last_rpe: 8, // RPE 'duro' → escala 8
      });

      // ── 7. Simular otro dispositivo: borrar el twin del store local ──
      await page.evaluate(() => {
        const raw = localStorage.getItem('chispa_store');
        if (!raw) return;
        const data = JSON.parse(raw) as { state?: Record<string, unknown> };
        if (data?.state) {
          data.state.twin = null;
          data.state.workouts = [];
        }
        localStorage.setItem('chispa_store', JSON.stringify(data));
      });

      // ── 8. Recargar: INITIAL_SESSION → pull → applyPulledPayload restaura el twin ──
      await page.reload();
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              try {
                const raw = localStorage.getItem('chispa_store');
                if (!raw) return false;
                const data = JSON.parse(raw) as {
                  state?: { twin?: { ex_progress?: Record<string, any> } | null };
                };
                const ex = data?.state?.twin?.ex_progress?.['Bodyweight_Squat'];
                return !!(ex && ex.hard === 1 && ex.last_date);
              } catch {
                return false;
              }
            }),
          { timeout: 25000, intervals: [1000] }
        )
        .toBe(true);

      // ── 9. El valor restaurado coincide con lo guardado ──
      const restored = await page.evaluate(() => {
        const raw = localStorage.getItem('chispa_store');
        if (!raw) return null;
        const data = JSON.parse(raw) as {
          state?: { twin?: { ex_progress?: Record<string, any> } | null };
        };
        return data?.state?.twin?.ex_progress?.['Bodyweight_Squat'] ?? null;
      });
      expect(restored).toMatchObject({ hard: 1, last_date: today, total: 1 });

      // Sin errores de consola en todo el flujo
      expect(pageErrors).toEqual([]);
    } finally {
      // ── 10. Limpieza: borra el usuario → cascade elimina users/profiles/twin/workouts ──
      if (userId) {
        await deleteUser(userId);
        userId = null;
      }
    }
  });

  /** Lee las chispas reales del feed en la DB (solo las del usuario) */
  async function getMyPosts(uid: string): Promise<{ id: string; kind: string; author_id: string }[]> {
    const res = await adminFetch(
      `/rest/v1/community_posts?user_id=eq.${uid}&select=id,kind,author_id`
    );
    if (!res.ok) return [];
    return (await res.json()) as { id: string; kind: string; author_id: string }[];
  }

  test('chispas: quick-log con coop activo → push → otro dispositivo → pull restaura el feed', async ({ page }) => {
    test.skip(!ready, skipReason || 'Entorno Supabase no disponible');
    test.setTimeout(120_000);

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const t = msg.text();
      if (t.includes('Hydration failed') || t.includes('favicon')) return;
      if (t.includes('status of 404')) return;
      if (t.includes('status of 406')) return;
      pageErrors.push(t);
    });

    await page.addInitScript(() => {
      if ('serviceWorker' in navigator) {
        Object.defineProperty(navigator, 'serviceWorker', {
          value: {
            register: () => Promise.resolve({}),
            getRegistration: () => Promise.resolve(null),
            getRegistrations: () => Promise.resolve([]),
          },
          configurable: true,
        });
      }
    });

    // ── 1. Usuario desechable + seed mínimo (twin necesario para el save del quick-log) ──
    // El test de chispas requiere la migración 015 (community_posts): si no
    // está aplicada, salta con un mensaje claro en vez de fallar.
    if (!ready) {
      test.skip(true, skipReason || 'Entorno Supabase no disponible');
      return;
    }
    const feedReady = await communityPostsReady();
    if (!feedReady) {
      const ref = SB_URL.replace(/^https?:\/\//, '').replace(/\.supabase\.co.*$/, '');
      test.skip(true, `Migración 015 no aplicada: ejecuta la parte de community_posts de run-all-migrations.sql en https://supabase.com/dashboard/project/${ref}/sql/new`);
      return;
    }
    emailSuffix = 'chispas';
    EMAIL = `e2e-roundtrip-${Date.now()}-${emailSuffix}@chispa.app`;
    userId = await createUser();
    const uid = userId;
    try {
      await seedRow('users', { id: uid, email: EMAIL, name: 'E2E Chispas' });
      await seedRow('profiles', {
        user_id: uid,
        goal: 'fuerza',
        level: 'inicio',
        equipment: 'ninguno',
        limitations: [],
        days_per_week: '2-3',
        neurotype: 'adh-c',
        preferred_duration: 20,
        name: 'E2E Chispas',
      });
      await seedRow('digital_twins', {
        user_id: uid,
        motivation_style: 'data',
        avoid_patterns: [],
        best_hours: {},
        patterns: { completion_rate: 0.5, avg_duration: 20, abandon_rate: 0.2, best_hours: {} },
        exercise_progress: {},
        lang: 'es',
        preferred_duration: 20,
        confidence: 50,
      });

      // ── 2. Login real por la UI ──
      await page.goto('/');
      await page.getByText('Iniciar sesión').click();
      await page.locator('#login-email').fill(EMAIL);
      await page.locator('#login-password').fill(PASSWORD);
      await page.locator('button', { hasText: 'Entrar' }).click();
      await expect(page.locator('text=Crear rutina')).toBeVisible({ timeout: 20000 });

      // Esperar a que el pull post-login haya aplicado twin+profile al store
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              try {
                const raw = localStorage.getItem('chispa_store');
                if (!raw) return false;
                const s = (JSON.parse(raw) as { state?: Record<string, unknown> }).state;
                return !!(s && s.twin && s.profile);
              } catch {
                return false;
              }
            }),
          { timeout: 15000, intervals: [500] }
        )
        .toBe(true);

      // ── 3. Activar modo cooperativo en Perfil (Amigos → genera chispas) ──
      await openExtraMenu(page, 'Perfil');
      await page.locator('button', { hasText: 'Amigos' }).click();
      await page.waitForTimeout(400);

      // ── 4. Volver al home y hacer un quick-log (crea chispas workout + quicklog) ──
      await navigateToNavScreen(page, 'Inicio');
      await expect(page.locator('text=Crear rutina').first()).toBeVisible();
      await navigateFromHome(page, 'Registro rápido');
      await page.locator('button').filter({ hasText: 'Siguiente' }).click();
      await page.waitForTimeout(500);
      await page.locator('button').filter({ hasText: /Siguiente|Continuar sin detalles/ }).first().click();
      await page.waitForTimeout(500);
      await page.locator('button').filter({ hasText: 'Duro' }).click();
      await page.waitForTimeout(200);
      await page.locator('button').filter({ hasText: '¡Listo! Guardar' }).click();
      await page.waitForTimeout(500);
      await page.locator('button').filter({ hasText: 'Ir al inicio' }).click();
      await page.waitForTimeout(500);

      // ── 5. El push (con communityPosts) escribió la chispa del quick-log en la DB real ──
      await expect
        .poll(
          async () => {
            const posts = await getMyPosts(uid);
            return posts.some((p) => p.kind === 'quicklog');
          },
          { timeout: 20000, intervals: [1000] }
        )
        .toBe(true);

      // ── 6. Simular otro dispositivo: borrar el feed del store local ──
      await page.evaluate(() => {
        const raw = localStorage.getItem('chispa_store');
        if (!raw) return;
        const data = JSON.parse(raw) as { state?: Record<string, unknown> };
        if (data?.state) {
          data.state.communityPosts = [];
        }
        localStorage.setItem('chispa_store', JSON.stringify(data));
      });

      // ── 7. Recargar → pull → mergePosts restaura la chispa propia (author_id '') ──
      await page.reload();
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              try {
                const raw = localStorage.getItem('chispa_store');
                if (!raw) return false;
                const data = JSON.parse(raw) as {
                  state?: {
                    communityPosts?: { kind: string; author_id: string }[];
                  };
                };
                const posts = data?.state?.communityPosts ?? [];
                return posts.some((p) => p.kind === 'quicklog' && p.author_id === '');
              } catch {
                return false;
              }
            }),
          { timeout: 25000, intervals: [1000] }
        )
        .toBe(true);

      // Sin errores de consola en todo el flujo
      expect(pageErrors).toEqual([]);
    } finally {
      // ── 8. Limpieza ──
      if (userId) {
        await deleteUser(userId);
        userId = null;
      }
    }
  });
});
