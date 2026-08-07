/**
 * e2e · ROUND-TRIP REAL CON SUPABASE
 * ==================================
 * Verifica el ciclo completo de persistencia de la inteligencia del Digital Twin:
 *
 *   completar sesión → push a Supabase → recargar → pull → el twin conserva hard/last_date
 *
 * Requisitos (si no se cumplen, el test salta con un mensaje claro, no falla):
 *   1. Credenciales reales en .env.local (NEXT_PUBLIC_SUPABASE_URL,
 *      NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).
 *   2. Esquema reconciliado: ejecutar `supabase/run-all-migrations.sql` en el
 *      SQL Editor del dashboard (crea neuro_profiles/quest_states/achievements/
 *      leaderboard y renombra ex_progress→exercise_progress, avoid→avoid_patterns,
 *      sleep→sleep_hours; añade lang, best_hours, preferred_duration, confidence).
 *
 * El test crea un usuario desechable vía admin API (service role), siembra un
 * twin mínimo, completa una sesión real por la UI (crear rutina → Sentadilla →
 * 3 series → RPE Duro → guardar), comprueba la fila en la DB real, simula otro
 * dispositivo (borra el twin local), recarga y verifica que el pull restaura
 * hard/last_date desde Supabase. Al final elimina el usuario (cascade limpia todo).
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

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
  return { ...process.env, ...env };
}

const env = loadEnv();
const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SB_SERVICE = env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/* ─── Usuario desechable ─── */
const EMAIL = `e2e-roundtrip-${Date.now()}@chispa.app`;
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

test.describe('Round-trip real con Supabase: twin conserva hard/last_date', () => {
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
});
