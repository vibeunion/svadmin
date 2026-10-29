import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'copy-button.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4199' },
  projects: [{ name: 'chromium-desktop', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'node ../../../node_modules/vite/bin/vite.js --config vite.config.ts --host 127.0.0.1 --port 4199 --strictPort',
    url: 'http://127.0.0.1:4199',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
