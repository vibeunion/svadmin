import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: 'workflow.e2e.ts', fullyParallel: false, workers: 1,
  outputDir: '../../test-results/surface-workflows', reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4178', browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: { cwd: fileURLToPath(new URL('../..', import.meta.url)), command: 'bun run vite --config scripts/surface-workflows/vite.config.ts', url: 'http://127.0.0.1:4178', reuseExistingServer: false },
});
