import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './scripts/fixtures/enterprise-ui', testMatch: 'browser.spec.ts', outputDir: 'test-results/enterprise/browser',
  fullyParallel: true, forbidOnly: true, retries: 0, workers: 2,
  reporter: [['list'], ['json', { outputFile: 'test-results/enterprise/browser-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:4187', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'bun run vite preview --config scripts/fixtures/enterprise-ui/vite.config.ts', url: 'http://127.0.0.1:4187', reuseExistingServer: !process.env['CI'], timeout: 120000 },
});
