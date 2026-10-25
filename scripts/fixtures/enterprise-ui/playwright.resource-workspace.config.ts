import { defineConfig } from '@playwright/test';
import taskConfig from './playwright.task-list.config';

const baseURL = 'http://127.0.0.1:4191';

export default defineConfig({
  ...taskConfig,
  testMatch: 'resource-workspace.spec.ts',
  grep: /ResourceWorkspace/,
  use: { ...taskConfig.use, baseURL },
  webServer: {
    command: 'node ../../../node_modules/vite/bin/vite.js --config vite.config.ts --host 127.0.0.1 --port 4191 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: (['chromium', 'webkit', 'firefox'] as const).flatMap(browserName => [
    { name: `${browserName}-desktop`, use: { browserName, viewport: { width: 1440, height: 1000 } } },
    { name: `${browserName}-narrow`, use: { browserName, viewport: { width: 390, height: 844 } } },
  ]),
});
