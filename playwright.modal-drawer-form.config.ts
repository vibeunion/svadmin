import { defineConfig } from '@playwright/test';

// 专属验证配置：只跑 ModalForm/DrawerForm 浏览器用例。
// 独立单 worker + 空闲端口 + 不复用已有 server，避免与其他套件或残留 Vite 进程互相污染。
const baseURL = 'http://127.0.0.1:4193';

export default defineConfig({
  testDir: './scripts/fixtures/enterprise-ui',
  testMatch: 'modal-drawer-form.spec.ts',
  outputDir: 'test-results/enterprise/modal-drawer-form',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  reporter: [['list'], ['json', { outputFile: 'test-results/enterprise/modal-drawer-form-results.json' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: (['chromium', 'webkit', 'firefox'] as const).flatMap(browserName => [
    { name: `${browserName}-desktop`, use: { browserName, viewport: { width: 1440, height: 1000 } } },
    { name: `${browserName}-narrow`, use: { browserName, viewport: { width: 390, height: 844 } } },
  ]),
  webServer: {
    command:
      'bun run vite build --config scripts/fixtures/enterprise-ui/vite.config.ts && '
      + 'bun run vite preview --config scripts/fixtures/enterprise-ui/vite.config.ts --port 4193 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});