import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
    },
  },

  /* Run next build + start before tests in CI */
  ...(process.env.CI
    ? {
        webServer: {
          command: 'npm run build && npm start',
          port: 3000,
          reuseExistingServer: false,
          timeout: 120_000,
        },
      }
    : {}),

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
