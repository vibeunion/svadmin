import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4194';

export default defineConfig({
  testDir: '.',
  testMatch: 'form-reset.spec.ts',
  outputDir: '../../../test-results/form-reset',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } } },
    { name: 'chromium-narrow', use: { browserName: 'chromium', viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'node ../../../node_modules/vite/bin/vite.js --config vite.config.ts --host 127.0.0.1 --port 4194 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});