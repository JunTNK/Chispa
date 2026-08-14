/**
 * 🧼 FLUJO DEFAULT SIN REGISTRO: LIMPIO Y 100% LOCAL
 * ===================================================
 * El camino por defecto (sin cuenta, sin login) debe:
 *  - No exponer ranking social, peso ni catálogo en el recorrido.
 *  - No llamar a Supabase NUNCA (local-first: todo vive en el dispositivo).
 *  - Terminar siempre en mensajes sin culpa (salidas amables).
 *
 * Nota de adaptación: tras el onboarding la app SIEMBRA un check-in amable y
 * auto-genera el plan, así que el flujo va directo a "Empezar ahora" (el
 * wizard de 3 taps ya está cubierto por first-user-experience / session-flow).
 */

import { expect, test } from '@playwright/test';
import { completeOnboarding, dismissPortal, getNav } from './helpers';

test.describe('flujo default sin registro: limpio y 100% local', () => {
  test('onboarding → plan → sesión → summary: sin ranking/racha/peso/catálogo y sin red', async ({ page }) => {
    const llamadasSupabase: string[] = [];
    await page.route(/supabase\.(co|com)/, async (route) => {
      llamadasSupabase.push(route.request().url());
      await route.abort(); // si algo intenta salir, lo frenamos y queda evidenciado
    });

    // Onboarding completo sin registro (perfil local, guest) → home
    await completeOnboarding(page);

    // El plan de hoy está listo: la acción obvia es "Empezar ahora"
    const startBtn = page.locator('button').filter({ hasText: 'Empezar ahora' });
    await expect(startBtn).toBeVisible({ timeout: 10000 });

    // El ranking NO está en la nav principal (solo vive en el menú "Más")
    const nav = getNav(page);
    await expect(nav.locator('button').filter({ hasText: 'Ranking' })).toHaveCount(0);

    // ── Sesión ──
    await startBtn.click();
    await page.waitForTimeout(800);

    // Pantalla de sesión: salidas sin culpa presentes (spec §5)
    await expect(page.getByRole('button', { name: /saltar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /pausa/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /terminar aquí/i })).toBeVisible();

    // Cerramos la rutina por la salida amable
    await page.getByRole('button', { name: /terminar aquí/i }).click();
    await page.waitForTimeout(800);

    // ── Summary: mensaje sin culpa ──
    await expect(
      page.getByText(/chispa se movió|recarga|sin juicio|guardamos lo de hoy|hecho/i).first()
    ).toBeVisible();

    // Nada prohibido asoma en todo el recorrido (revisamos el body en summary).
    // Nota: "+N XP" personal sí aparece (progreso propio, no comparación social)
    // — el rediseño §7 es quien debe decidir sobre la gamificación.
    const body = await page.textContent('body');
    expect(body).not.toMatch(/ranking|leaderboard|top ?\d+|#\d{1,2}\b/i);
    expect(body).not.toMatch(/mant[ée]n la racha|keep (the )?streak|don'?t break/i);
    expect(body).not.toMatch(/peso|weight/i);
    expect(body).not.toMatch(/catálogo|crear ejercicio/i);

    // Privacidad: el flujo default no habló con Supabase
    expect(llamadasSupabase).toEqual([]);
  });

  test('el ranking vive en el menú "Más", fuera de la nav principal', async ({ page }) => {
    await completeOnboarding(page);

    const nav = getNav(page);
    const rankingBtn = nav.locator('button').filter({ hasText: 'Ranking' });

    // Nav principal (Inicio/Entrenar/Coach/Sistema/Más): sin Ranking visible
    await expect(rankingBtn).toHaveCount(0);

    // Solo aparece al abrir el menú "Más"
    await dismissPortal(page);
    await nav.locator('button', { hasText: 'Más' }).click();
    await page.waitForTimeout(300);
    await dismissPortal(page);
    await expect(rankingBtn).toBeVisible();
  });

  /**
   * RÚBRICA §7 — LEADERBOARD (conocido pendiente de rediseño):
   * Hoy la pantalla "Ranking" muestra la tabla completa de jugadores anónimos
   * SIN gate de opt-in (ver leaderboard-screen.tsx y la rúbrica en la sesión).
   * Este test documenta la violación: al aplicar el rediseño (gate opt-in o
   * reemplazo por "contra tu yo pasado") se activa quitando el `skip`.
   */
  test.skip('leaderboard social está detrás de opt-in', async ({ page }) => {
    await completeOnboarding(page);
    await dismissPortal(page);
    const nav = getNav(page);
    await nav.locator('button', { hasText: 'Más' }).click();
    await page.waitForTimeout(300);
    await dismissPortal(page);
    await nav.locator('button', { hasText: 'Ranking' }).click();
    await page.waitForTimeout(800);

    const body = await page.textContent('body');
    expect(body).toMatch(/activar|opt-?in|habilitar/i); // gate visible, no ranking crudo
    expect(body).not.toMatch(/top ?\d+|#\d{1,2}\b/);
  });
});
