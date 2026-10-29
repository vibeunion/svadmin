import { defineConfig } from '@playwright/test';
import config from './playwright.scrollable-table.config';

export default defineConfig({
  ...config,
  testMatch: 'parity-review.spec.ts',
  use: { baseURL: 'http://127.0.0.1:4207' },
  webServer: {
    command: 'node ../../../node_modules/vite/bin/vite.js --config vite.config.ts --host 127.0.0.1 --port 4207 --strictPort',
    url: 'http://127.0.0.1:4207',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
