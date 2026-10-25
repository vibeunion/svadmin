import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4213';

export default defineConfig({
  testDir: '.',
  testMatch: 'detail-workspace.spec.ts',
  grep: /DetailWorkspace/,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: { baseURL },
  webServer: {
    command: 'node ../../../node_modules/vite/bin/vite.js --config vite.config.ts --host 127.0.0.1 --port 4213 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: (['chromium', 'webkit', 'firefox'] as const).flatMap(browserName => [
    { name: `${browserName}-desktop`, use: { browserName, viewport: { width: 1440, height: 1000 } } },
    { name: `${browserName}-narrow`, use: { browserName, viewport: { width: 390, height: 844 } } },
  ]),
});