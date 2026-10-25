import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'import-export-center.spec.ts',
  outputDir: 'output/playwright/import-export-center',
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [['list'], ['json', { outputFile: 'output/playwright/import-export-center/results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4195',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-narrow', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
    { name: 'webkit-desktop', use: { browserName: 'webkit', viewport: { width: 1440, height: 1000 } } },
    { name: 'webkit-narrow', use: { browserName: 'webkit', viewport: { width: 390, height: 844 } } },
    { name: 'firefox-desktop', use: { browserName: 'firefox', viewport: { width: 1440, height: 1000 } } },
    { name: 'firefox-narrow', use: { browserName: 'firefox', viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'node ../../../node_modules/vite/bin/vite.js --config vite.config.ts --host 127.0.0.1 --port 4195 --strictPort',
    url: 'http://127.0.0.1:4195',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
