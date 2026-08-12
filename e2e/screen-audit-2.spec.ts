/**
 * 🎯 SCREEN AUDIT — Part 2: Nav Screens & Profile
 * Quest -> Coach -> Sistema -> Progress -> Profile -> Dopamina -> Patrones -> Comunidad
 */
import { test, expect } from '@playwright/test';
import { completeOnboarding, startCapture, checkErrors, resetErrors, reportAudit, openExtraMenu } from './helpers';

test('Audit 2/3 — Quest → Coach → Sistema → Progress → Profile → Dopamina → Patrones → Comunidad', async ({ page }) => {
  resetErrors();
  startCapture(page);

  // Onboarding → Home
  await page.goto('/');
  await completeOnboarding(page);
  await page.waitForTimeout(400);
  const nav = page.locator('nav[aria-label="Navegación principal"]');

  // 7. QUEST (vía menú 'Más': Quest no está en el navbar)
  await openExtraMenu(page, 'Quest');
  await checkErrors(page, 'quest');
  console.log('✅ 7. Quest');

  // 8. COACH
  await nav.locator('button').filter({ hasText: 'Coach' }).click();
  await page.waitForTimeout(500);
  await checkErrors(page, 'coach');
  console.log('✅ 8. Coach');

  // 9. SISTEMA
  await nav.locator('button').filter({ hasText: 'Sistema' }).click();
  await page.waitForTimeout(500);
  await checkErrors(page, 'sistema');
  console.log('✅ 9. Sistema');

  // 10. PROGRESS
  await openExtraMenu(page, 'Progreso');
  await checkErrors(page, 'progress');
  console.log('✅ 10. Progress');

  // 11. PROFILE
  await openExtraMenu(page, 'Perfil');
  await checkErrors(page, 'profile');
  await expect(page.locator('text=Digital Twin')).toBeVisible();
  await expect(page.locator('text=Accesibilidad')).toBeVisible();
  await expect(page.locator('text=Exportar datos')).toBeVisible();
  // La pantalla de perfil renderiza switches de accesibilidad (espera
  // auto-retry por la carga async; 7 actualmente: Reducir movimiento + 6 prefs)
  const switches = page.locator('[role="switch"]');
  await expect(switches.first()).toBeVisible({ timeout: 15000 });
  expect(await switches.count()).toBeGreaterThanOrEqual(3);
  console.log('✅ 11. Profile');

  // 12. DOPAMINA
  await openExtraMenu(page, 'Dopamina');
  await checkErrors(page, 'dopamina');
  console.log('✅ 12. Dopamina');

  // 13. PATRONES (analytics — pantalla Pro; en free muestra la card bloqueada)
  await openExtraMenu(page, 'Patrones');
  await checkErrors(page, 'analytics');
  console.log('✅ 13. Patrones');

  // 14. COMUNIDAD (feed cooperativo)
  await openExtraMenu(page, 'Comunidad');
  await checkErrors(page, 'comunidad');
  console.log('✅ 14. Comunidad');

  const errCount = reportAudit('Audit 2/3', 8);
  expect(errCount).toBe(0);
});
