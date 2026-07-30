/**
 * 🎯 SCREEN AUDIT — Part 1: Auth & Workout Creation
 * Welcome -> Login -> Register -> Home -> CreateWorkout -> Catalog
 */
import { test, expect } from '@playwright/test';
import { completeOnboarding, startCapture, checkErrors, resetErrors, reportAudit } from './helpers';

test('Audit 1/3 — Welcome → Login → Register → Home → Create → Catalog', async ({ page }) => {
  resetErrors();
  startCapture(page);

  // 1. WELCOME
  await page.goto('/');
  await page.waitForTimeout(400);
  await checkErrors(page, 'welcome');
  await expect(page.locator('h1')).toContainText('CHISPA');
  await expect(page.locator('#cta-btn')).toHaveText('Crear mi perfil');
  await expect(page.getByText('Iniciar sesión')).toBeVisible();
  console.log('✅ 1. Welcome');

  // 2. LOGIN
  await page.getByText('Iniciar sesión').click();
  await page.waitForTimeout(400);
  await checkErrors(page, 'login');
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
  await expect(page.locator('button[aria-label="Volver"]')).toBeVisible();
  console.log('✅ 2. Login');

  // 3. REGISTER
  await page.locator('button').filter({ hasText: 'Registrarse' }).click();
  await page.waitForTimeout(400);
  await checkErrors(page, 'register');
  await expect(page.locator('h1')).toContainText('Crear cuenta');
  console.log('✅ 3. Register');

  // 4. ONBOARDING → HOME
  await completeOnboarding(page);
  await page.waitForTimeout(500);
  await checkErrors(page, 'home');
  await expect(page.locator('text=Crear rutina')).toBeVisible();
  await expect(page.locator('nav[aria-label="Navegación principal"]')).toBeVisible();
  console.log('✅ 4. Home');

  // 5. CREATE WORKOUT
  await page.locator('text=Crear rutina').click();
  await page.waitForTimeout(700);
  await checkErrors(page, 'create-workout');
  await expect(page.locator('text=¿Qué grupo muscular quieres trabajar?')).toBeVisible();
  for (const label of ['Todo el cuerpo', 'Tren superior', 'Tren inferior', 'Core y cardio']) {
    await expect(page.locator('button').filter({ hasText: label })).toBeVisible();
  }
  console.log('✅ 5. Create Workout');

  // 6. CATALOG
  await page.locator('button').filter({ hasText: 'Todo el cuerpo' }).click();
  await page.waitForTimeout(1000);
  await checkErrors(page, 'catalog');
  await expect(page.locator('text=Paso 2 de 2')).toBeVisible();
  await expect(page.locator('text=Toque para agregar')).toBeVisible({ timeout: 3000 });
  console.log('✅ 6. Catalog');

  const errCount = reportAudit('Audit 1/3', 6);
  expect(errCount).toBe(0);
});
