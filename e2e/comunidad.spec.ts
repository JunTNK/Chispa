/**
 * 🤝 COMUNIDAD — feed social cooperativo (e2e)
 *
 * - Sin modo cooperativo → empty state con CTA a Perfil.
 * - Con coopMode activo, un quick-log crea una chispa y el aplauso suma.
 */
import { test, expect } from '@playwright/test';
import {
  completeOnboarding,
  openExtraMenu,
  navigateToNavScreen,
  navigateFromHome,
} from './helpers';

test.describe('Feed social cooperativo (Comunidad)', () => {
  test('1. coopMode none → empty state con CTA a Perfil', async ({ page }) => {
    await completeOnboarding(page, 20000);
    await openExtraMenu(page, 'Comunidad');

    await expect(page.getByText('Activa el modo cooperativo para compartir tus chispas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ir a Perfil' })).toBeVisible();
  });

  test('2. con coopMode amigos, un quick-log crea una chispa y el aplauso suma', async ({ page }) => {
    await completeOnboarding(page, 20000);

    // Activar modo cooperativo en Perfil
    await openExtraMenu(page, 'Perfil');
    await page.locator('button', { hasText: 'Amigos' }).click();
    await page.waitForTimeout(400);

    // Volver al home
    await navigateToNavScreen(page, 'Inicio');
    await expect(page.locator('text=Crear rutina').first()).toBeVisible();

    // Registro rápido → guardar sin detalles extra (flujo mínimo)
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

    // La chispa aparece en la Comunidad. El quick-log genera 2 chispas legítimas
    // (la app registra el workout + el log rápido), así que apuntamos a la del quicklog.
    await openExtraMenu(page, 'Comunidad');
    const quicklogCard = page.getByRole('article').filter({ hasText: 'Registré movimiento rápido' });
    await expect(quicklogCard).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Completé un entrenamiento de')).toBeVisible();

    // Aplauso cooperativo: suma 1 y queda marcado
    await quicklogCard.getByLabel('Aplaudir esta chispa').click();
    await page.waitForTimeout(300);
    await expect(quicklogCard.getByLabel('Quitar aplauso')).toBeVisible();
    const count = await quicklogCard.locator('span.tabular-nums').textContent();
    expect(count?.trim()).toBe('1');
  });
});
