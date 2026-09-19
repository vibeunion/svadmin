import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: '*.spec.ts', workers: 1, retries: 0, timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4175', viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure' },
  reporter: [['list'], ['html', { outputFolder: 'report', open: 'never' }]], outputDir: 'results',
  webServer: { command: 'node ../../../node_modules/vite/bin/vite.js --config vite.config.ts',
    url: 'http://127.0.0.1:4175', reuseExistingServer: false, timeout: 60_000 },
});
