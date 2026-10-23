import { defineConfig } from '@playwright/test';
import taskConfig from './playwright.task-list.config';

const baseURL = 'http://127.0.0.1:4194';

export default defineConfig({
  ...taskConfig,
  testMatch: 'quick-edit-lifecycle.spec.ts',
  grep: /QuickEditLifecycle/,
  workers: 1,
  use: { ...taskConfig.use, baseURL, trace: 'retain-on-failure' },
  webServer: {
    command: 'node ../../../node_modules/vite/bin/vite.js --config vite.config.ts --host 127.0.0.1 --port 4194 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: (['chromium', 'webkit', 'firefox'] as const).flatMap(browserName => [
    { name: `${browserName}-desktop`, use: { browserName, viewport: { width: 1440, height: 1000 } } },
    { name: `${browserName}-narrow`, use: { browserName, viewport: { width: 390, height: 844 } } },
  ]),
});