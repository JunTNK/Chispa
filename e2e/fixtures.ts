/**
 * 🎭 Playwright Fixtures for CHISPA E2E Tests
 *
 * Provides network mocking to prevent model downloads during tests.
 * This makes tests faster and more reliable.
 */
import { test as base, type Page } from '@playwright/test';

/**
 * Intercepts network requests to prevent model downloads.
 * The coach screen will fall back to rule-based responses.
 */
export async function interceptModelDownloads(page: Page) {
  // Block Transformers.js CDN requests
  await page.route('**/transformers**', async (route) => {
    await route.abort();
  });

  // Block ONNX model downloads
  await page.route('**/onnx-community**', async (route) => {
    await route.abort();
  });

  // Block HuggingFace model downloads
  await page.route('**/huggingface.co**', async (route) => {
    await route.abort();
  });

  // Block any large binary downloads (model files)
  await page.route('**/*.onnx', async (route) => {
    await route.abort();
  });

  await page.route('**/*.bin', async (route) => {
    await route.abort();
  });
}

/**
 * Custom test fixture that includes network mocking
 */
export const test = base.extend({
  // Override page fixture to add network mocking
  page: async ({ page: basePage }, callback) => {
    // Intercept model downloads before page loads
    await interceptModelDownloads(basePage);

    await callback(basePage);
  },
});

export { expect } from '@playwright/test';
