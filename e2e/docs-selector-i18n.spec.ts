/**
 * e2e · Spec vivo /docs/selector — toggle de idioma (ES → EN)
 *
 * Verifica que el botón de idioma de la topbar cambia:
 *   1. Títulos de sección del índice (La tesis → The thesis, Diagnóstico → Diagnosis)
 *   2. El simulador del motor de relevancia (Score de relevancia → Relevance score,
 *      chip de enfoque Cuerpo completo → Full body)
 *   3. El manifiesto copiado (cabecera EN "IMPLEMENTATION MANIFESTO · CHISPA SELECTOR")
 *      y el feedback del botón copiar (Copy manifesto → copied!)
 */
import { test, expect } from '@playwright/test';

test.describe('/docs/selector · idioma EN', () => {
  test('el toggle cambia títulos de sección, simulador y manifiesto copiado a inglés', async ({ page, context }) => {
    // Clipboard real para verificar el contenido del manifiesto copiado
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/docs/selector');

    // ── Estado inicial: ES ──
    // Títulos de sección en el índice
    await expect(page.locator('nav a[href^="#s"]', { hasText: 'La tesis' })).toBeVisible();
    await expect(page.locator('nav a[href^="#s"]', { hasText: 'Diagnóstico' })).toBeVisible();

    // Simulador en ES
    // exact: la descripción del principio 01 contiene "score de relevancia" como substring
    await expect(page.getByText('Score de relevancia', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cuerpo completo' })).toBeVisible();

    // Botón copiar en ES (topbar)
    await expect(page.locator('header').getByRole('button', { name: 'Copiar manifiesto' })).toBeVisible();

    // ── Pulsar el toggle EN ──
    await page.getByRole('button', { name: 'View in English' }).click();

    // ── Títulos de sección en EN ──
    await expect(page.locator('nav a[href^="#s"]', { hasText: 'The thesis' })).toBeVisible();
    await expect(page.locator('nav a[href^="#s"]', { hasText: 'Diagnosis' })).toBeVisible();
    // El ES desaparece del índice
    await expect(page.locator('nav a[href^="#s"]', { hasText: 'La tesis' })).toHaveCount(0);

    // ── Simulador en EN ──
    // exact: la descripción EN del principio 01 contiene "relevance score" como substring
    await expect(page.getByText('Relevance score', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Full body' })).toBeVisible();

    // ── Manifiesto copiado en EN ──
    const copyBtn = page.locator('header').getByRole('button', { name: 'Copy manifesto' });
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();

    // Feedback "copied!" (estado transitorio ~1.7s)
    await expect(page.locator('header').getByRole('button', { name: 'copied!' })).toBeVisible({ timeout: 5000 });

    // Contenido del portapapeles: cabecera EN, sin rastro de la ES
    // Poll: el write es async y Chromium headless puede tardar en servir el read
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()), { timeout: 5000 })
      .toContain('IMPLEMENTATION MANIFESTO · CHISPA SELECTOR');
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).not.toContain('MANIFIESTO DE IMPLEMENTACIÓN');
    expect(clipboard).toContain('01. Catalog and routine are separate entities');

    expect(errors, 'Sin errores JS en la página del spec').toHaveLength(0);
  });

  test('el toggle vuelve a español (EN → ES)', async ({ page }) => {
    await page.goto('/docs/selector');

    // A EN
    await page.getByRole('button', { name: 'View in English' }).click();
    await expect(page.locator('nav a[href^="#s"]', { hasText: 'The thesis' })).toBeVisible();

    // Y de vuelta a ES
    await page.getByRole('button', { name: 'Ver en español' }).click();
    await expect(page.locator('nav a[href^="#s"]', { hasText: 'La tesis' })).toBeVisible();
    await expect(page.locator('nav a[href^="#s"]', { hasText: 'Diagnóstico' })).toBeVisible();
    await expect(page.locator('nav a[href^="#s"]', { hasText: 'The thesis' })).toHaveCount(0);
  });
});
