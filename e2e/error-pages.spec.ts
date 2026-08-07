/**
 * 🔴 PÁGINAS DE ERROR — e2e permanente.
 *
 * Cubre los dos fallbacks visibles por ruta:
 *   1. not-found.tsx (404) — funciona en dev y producción.
 *   2. error.tsx (error lanzado) — SOLO se renderiza en builds de producción;
 *      en modo dev, Next.js muestra su overlay de errores en su lugar, así que
 *      el test se esquiva automáticamente en dev.
 *
 * La ruta /error-demo?throw=1 (src/app/error-demo/page.tsx) lanza un error
 * únicamente con ese query param — sin él es una página inofensiva.
 */
import { test, expect } from '@playwright/test';

test.describe('Páginas de error', () => {
  test('404 muestra not-found.tsx', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/ruta-que-no-existe-xyz');
    await expect(page.locator('h1')).toContainText('404');
    await expect(page.locator('h1')).toContainText('Página no encontrada');
    await expect(page.getByText('La página que buscas no existe o fue movida.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Volver al inicio' })).toBeVisible();

    expect(errors, 'Errores de consola inesperados').toHaveLength(0);
  });

  test('404 permite volver al inicio', async ({ page }) => {
    await page.goto('/otra-ruta-inexistente-abc');

    // Podría estar en la pantalla de bienvenida o en el home según el estado
    await page.getByRole('button', { name: 'Volver al inicio' }).click();
    await page.waitForURL('**/');
  });

  test('error.tsx se muestra ante un error lanzado (producción)', async ({ page }) => {
    // El error lanzado es capturado por el boundary de React, así que en
    // producción NO llega a window.onerror (pageerror); React lo registra vía
    // console.error. Escuchamos ambos canales por robustez.
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/error-demo?throw=1');

    // Espera a que el error salte (el useEffect dispara el throw tras el mount).
    // Si aparece el overlay de Next (dev), el test se esquiva: error.tsx solo
    // existe en producción.
    const portal = page.locator('nextjs-portal');
    await page.waitForTimeout(3000);

    const devOverlayVisible = await portal.count().then((n) => n > 0);
    test.skip(
      devOverlayVisible,
      'Dev overlay presente — error.tsx solo se renderiza en builds de producción'
    );

    await expect(page.locator('h1')).toHaveText('Algo salió mal');
    await expect(page.getByText(/tu progreso está guardado localmente/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Intentar de nuevo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Volver al inicio' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Recargar la página' })).toBeVisible();

    // El error simulado debe haberse registrado en consola (pageerror o console.error)
    expect(errors.some((e) => e.includes('Error simulado para e2e'))).toBe(true);
  });

  test('error.tsx permite reintentar tras el error', async ({ page }) => {
    await page.goto('/error-demo?throw=1');
    await page.waitForTimeout(3000);

    const portal = page.locator('nextjs-portal');
    const devOverlayVisible = await portal.count().then((n) => n > 0);
    test.skip(
      devOverlayVisible,
      'Dev overlay presente — error.tsx solo se renderiza en builds de producción'
    );

    // "Intentar de nuevo" remonta la página → vuelve a lanzar (ruta que siempre
    // lanza) → el boundary reaparece. Verificamos que el botón existe y responde.
    const retry = page.getByRole('button', { name: 'Intentar de nuevo' });
    await retry.click();
    await page.waitForTimeout(1500);
    await expect(page.locator('h1')).toHaveText('Algo salió mal');
  });
});
