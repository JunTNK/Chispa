/**
 * E2E: Form Check camera — end-to-end verification.
 *
 * Verifies the posture-camera fix: the <video> element must be mounted
 * before startCamera() runs (otherwise usePose aborts with a null ref and
 * the feed stays black forever), and the camera stream must actually
 * attach to the video element with granted permission.
 *
 * Uses Chrome's fake media device so getUserMedia resolves without a
 * physical camera, plus an explicitly granted camera permission.
 */
import { test, expect } from '@playwright/test';
import { completeOnboarding } from './helpers';

test.use({
  launchOptions: {
    channel: 'chrome',
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--no-sandbox',
    ],
  },
  permissions: ['camera'],
});

test.describe('Form Check — camera end-to-end', () => {
  test('camera stream attaches to the video element and UI reaches live state', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

    // ── 1. Onboarding → Home ──
    await completeOnboarding(page, 30000);

    // ── 2. Create a workout ──
    await page.locator('text=Crear rutina').click();
    await page.waitForTimeout(600);
    await page.locator('button').filter({ hasText: 'Todo el cuerpo' }).click();
    await page.waitForTimeout(600);
    await expect(page.locator('text=Elige ejercicios')).toBeVisible();

    // Add the first exercise from the guided-mode suggestions
    // (redesigned selector CHISPA-UX-002: mode Guíame is the default,
    // the old quick-add grid div.grid.grid-cols-4 no longer exists).
    // Scope to suggestion add-buttons: the balance map chips also start with
    // "Añadir " but end with " a la rutina" (e.g. "Añadir Fuerza a la rutina").
    await page.locator('button[aria-label^="Añadir "]:not([aria-label$="a la rutina"])').first().click();
    await page.waitForTimeout(400);

    // Start the session
    await page.locator('button').filter({ hasText: 'Empezar ahora' }).click();
    await page.waitForTimeout(1200);

    // ── 3. Open Form Check ──
    await page.locator('button').filter({ hasText: 'Form' }).click();

    // ── 4. THE FIX: video must mount AND receive the camera stream ──
    await page.waitForFunction(
      () => {
        const v = document.querySelector('video');
        if (!v || !v.srcObject) return false;
        const tracks = (v.srcObject as MediaStream).getVideoTracks?.();
        return tracks && tracks.length > 0;
      },
      undefined,
      { timeout: 45_000 }
    );

    // The stream is attached; wait for playback to actually start
    // (play() is called inside onloadedmetadata, so this can lag the
    // srcObject assignment by a moment).
    await page.waitForFunction(
      () => {
        const v = document.querySelector('video');
        return !!v && !v.paused && v.readyState >= 2;
      },
      undefined,
      { timeout: 20_000 }
    );

    const streamInfo = await page.evaluate(() => {
      const v = document.querySelector('video')!;
      const s = v.srcObject as MediaStream;
      return {
        hasVideoTrack: s.getVideoTracks().length > 0,
        readyState: v.readyState,
        playing: !v.paused && v.readyState >= 2,
      };
    });
    expect(streamInfo.hasVideoTrack).toBe(true);
    expect(streamInfo.playing).toBe(true);

    // ── 5. UI live state (cameraStatus 'real') ──
    // The fake camera shows a test pattern (no person), so landmarks/angles
    // stay absent — but the overlay must reach the live state, which renders
    // the LIVE badge whenever isCameraLive is true.
    await expect
      .poll(
        async () => page.locator('text=LIVE').count(),
        { timeout: 45_000 }
      )
      .toBeGreaterThan(0);

    // ── 6. No camera/permission errors ──
    const cameraErrors = consoleErrors.filter(
      (e) => /getUserMedia|NotAllowed|NotFoundError|NotReadable|mediaDevices|Permission/i.test(e)
    );
    expect(cameraErrors).toEqual([]);

    await page.screenshot({ path: 'test-results/form-check-camera-live.png', fullPage: true });
  });
});
