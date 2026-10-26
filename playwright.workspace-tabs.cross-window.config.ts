import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5186';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'workspace-tabs.spec.ts',
  grep: /same-session windows synchronize tab collection without sharing list state/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    {
      name: 'chromium-desktop-cross-window',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: {
    command: 'cd example && node ../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5186 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
