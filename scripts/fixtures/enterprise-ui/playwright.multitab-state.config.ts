import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4193';

export default defineConfig({
  testDir: '.',
  testMatch: 'multitab-state.spec.ts',
  outputDir: '../../../test-results/multitab-state',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  timeout: 30_000,
  reporter: [['list'], ['json', { outputFile: '../../../test-results/multitab-state-results.json' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } } },
    { name: 'chromium-narrow', use: { browserName: 'chromium', viewport: { width: 390, height: 844 } } },
    { name: 'firefox-desktop', use: { browserName: 'firefox', viewport: { width: 1440, height: 1000 } } },
    { name: 'firefox-narrow', use: { browserName: 'firefox', viewport: { width: 390, height: 844 } } },
    { name: 'webkit-desktop', use: { browserName: 'webkit', viewport: { width: 1440, height: 1000 } } },
    { name: 'webkit-narrow', use: { browserName: 'webkit', viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'node ../../../node_modules/vite/bin/vite.js --config vite.config.ts --host 127.0.0.1 --port 4193 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});