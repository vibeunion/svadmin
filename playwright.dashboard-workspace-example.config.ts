import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5185';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'dashboard-workspace.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: (['chromium', 'webkit', 'firefox'] as const).flatMap(browserName => [
    { name: `${browserName}-desktop`, use: { browserName, viewport: { width: 1440, height: 1000 } } },
    { name: `${browserName}-narrow`, use: { browserName, viewport: { width: 390, height: 844 } } },
  ]),
  webServer: {
    command: 'cd example && node ../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5185 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});