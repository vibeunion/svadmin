import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'business-rendering.spec.ts',
  outputDir: 'test-results/rendering',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  reporter: [['list'], ['json', { outputFile: 'test-results/rendering-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun run --cwd example preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
