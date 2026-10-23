import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'approval-center-conflict.spec.ts',
  outputDir: '../../../test-results/approval-center-conflict',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  timeout: 30_000,
  reporter: [['list'], ['json', { outputFile: '../../../test-results/approval-center-conflict-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4221',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } } },
    { name: 'chromium-narrow', use: { browserName: 'chromium', viewport: { width: 390, height: 844 } } },
    { name: 'webkit-desktop', use: { browserName: 'webkit', viewport: { width: 1440, height: 1000 } } },
    { name: 'webkit-narrow', use: { browserName: 'webkit', viewport: { width: 390, height: 844 } } },
    { name: 'firefox-desktop', use: { browserName: 'firefox', viewport: { width: 1440, height: 1000 } } },
    { name: 'firefox-narrow', use: { browserName: 'firefox', viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'node ../../../node_modules/vite/bin/vite.js --config vite.config.ts --host 127.0.0.1 --port 4221 --strictPort',
    url: 'http://127.0.0.1:4221',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
