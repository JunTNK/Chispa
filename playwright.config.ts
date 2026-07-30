import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
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
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
