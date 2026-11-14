import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './scripts/visual-contract',
  testMatch: 'visual-contract.spec.ts',
  fullyParallel: false,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'python3 -m http.server 4174 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4174/e2e/fixtures/visual-contract.html',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
