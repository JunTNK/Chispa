/**
 * e2e · Persistencia del idioma en el Digital Twin (cross-device)
 *
 * Verifica el flujo completo de la preferencia de idioma:
 *   1. El usuario inicia sesión (Supabase mockeado a nivel de red).
 *   2. Cambia a EN en el perfil → el push escribe digital_twins.lang = 'en'.
 *   3. Simulamos otro dispositivo: forzamos el lang local del store a 'es'.
 *   4. Recargamos la página → la sesión se restaura (INITIAL_SESSION) → el
 *      pull lee digital_twins.lang desde Supabase → el store vuelve a 'en'.
 *
 * Dos claves de robustez:
 *   - Se neutraliza el service worker de la PWA (/sw.js): usa skipWaiting +
 *     clients.claim, toma control tras el primer load y hace que page.route
 *     deje de interceptar la red (las peticiones pasan por su fetch handler).
 *   - Las rutas usan regex (los globs estilo rest/v1 no matchean la URL real).
 */
import { test, expect } from '@playwright/test';
import { openExtraMenu } from './helpers';

const USER_ID = 'e2e-user-0000-0000-000000000000';
const EMAIL = 'e2e@chispa.app';
const PASSWORD = 'password123';

/* ─── Helpers de sesión fake (formato GoTrue) ─── */

const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

/** Cabeceras CORS: los mocks cross-origin deben responderlas o el fetch falla */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Expose-Headers': '*',
};

function fakeUser() {
  return {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: EMAIL,
    email_confirmed_at: '2026-01-01T00:00:00Z',
    app_metadata: { provider: 'email' },
    user_metadata: { full_name: 'E2E Tester' },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    identities: [],
  };
}

/** JWT fake con exp futura para que supabase-js no intente refresh en el reload */
function sessionBody() {
  const now = Math.floor(Date.now() / 1000);
  const accessToken = [
    b64url({ alg: 'HS256', typ: 'JWT' }),
    b64url({
      sub: USER_ID,
      email: EMAIL,
      exp: now + 3600,
      iat: now,
      aud: 'authenticated',
      role: 'authenticated',
    }),
    'signature',
  ].join('.');
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'refresh-token',
    user: fakeUser(),
  };
}

/** Fila de digital_twins tal como la lee el pull (lang incluido) */
function twinRow(lang: 'es' | 'en') {
  return {
    user_id: USER_ID,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    motivation_style: 'data',
    avoid_patterns: [],
    best_hours: {},
    preferred_duration: 20,
    patterns: { completion_rate: 0.5, avg_duration: 20, abandon_rate: 0.2, best_hours: {} },
    exercise_progress: {},
    lang,
  };
}

test.describe('Idioma persistido en el Digital Twin', () => {
  test('el lang del store se restaura desde Supabase tras recargar la página', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // La PWA registra /sw.js (skipWaiting + clients.claim): toma control de la
    // página tras el primer load y rompe page.route. Se neutraliza en cada
    // navegación (addInitScript corre también tras page.reload).
    await page.addInitScript(() => {
      if ('serviceWorker' in navigator) {
        // Sobrescritura intencional: register() no-op para que el SW nunca
        // instale ni reclame la página.
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

    // ── Estado del "servidor" mockeado ──
    const server = { lang: 'es' as 'es' | 'en' };

    // Auth: token (password + refresh) y usuario. Rutas por regex.
    await page.route(/\/auth\/v1\/token/, (route) =>
      route.fulfill({
        status: 200,
        headers: CORS,
        contentType: 'application/json',
        body: JSON.stringify(sessionBody()),
      })
    );
    await page.route(/\/auth\/v1\/user/, (route) =>
      route.fulfill({
        status: 200,
        headers: CORS,
        contentType: 'application/json',
        body: JSON.stringify(fakeUser()),
      })
    );

    // REST: digital_twins con estado en memoria; el resto vacío para que el pull no falle
    await page.route(/\/rest\/v1\//, async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      const isTwin = url.pathname.includes('digital_twins');

      if (isTwin && method === 'GET') {
        await route.fulfill({
          status: 200,
          headers: CORS,
          contentType: 'application/json',
          body: JSON.stringify(twinRow(server.lang)),
        });
        return;
      }
      if (isTwin) {
        // Upsert del push del perfil: captura el lang persistido
        const body = route.request().postDataJSON() as { lang?: 'es' | 'en' } | null;
        if (body?.lang === 'en' || body?.lang === 'es') server.lang = body.lang;
        await route.fulfill({ status: 201, headers: CORS, contentType: 'application/json', body: '[]' });
        return;
      }
      await route.fulfill({
        status: method === 'GET' ? 200 : 201,
        headers: CORS,
        contentType: 'application/json',
        body: '[]',
      });
    });

    // ── 1. Login con Supabase mockeado ──
    await page.goto('/');
    await page.getByText('Iniciar sesión').click();
    await page.locator('#login-email').fill(EMAIL);
    await page.locator('#login-password').fill(PASSWORD);
    await page.locator('button', { hasText: 'Entrar' }).click();
    await expect(page.locator('text=Crear rutina')).toBeVisible({ timeout: 15000 });

    // ── 2. Cambiar a EN en el perfil → push escribe digital_twins.lang='en' ──
    await openExtraMenu(page, 'Perfil');
    await page.locator('button').filter({ hasText: 'English' }).click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.lang), { timeout: 8000 })
      .toBe('en');
    // El push es fire-and-forget: dar margen a que el upsert llegue al mock
    await page.waitForTimeout(600);

    // ── 3. Simular otro dispositivo: el lang local del store dice 'es' ──
    await page.evaluate(() => {
      const raw = localStorage.getItem('chispa_store');
      if (!raw) return;
      const data = JSON.parse(raw) as { state?: { lang?: string } };
      if (data?.state) data.state.lang = 'es';
      localStorage.setItem('chispa_store', JSON.stringify(data));
    });

    // ── 4. Recargar: sesión restaurada → INITIAL_SESSION → pull → lang desde Supabase ──
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.lang), { timeout: 15000 })
      .toBe('en');

    // ── 5. La UI del welcome confirma el idioma restaurado (no el 'es' local) ──
    await expect(page.locator('#cta-btn')).toContainText('Create my profile');
    await expect(page.getByText('Log in', { exact: true })).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});
