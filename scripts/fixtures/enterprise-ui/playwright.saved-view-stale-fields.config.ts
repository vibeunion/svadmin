import { defineConfig } from '@playwright/test';
import taskConfig from './playwright.task-list.config';

const port = 4223;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  ...taskConfig,
  testMatch: 'saved-view-stale-fields.spec.ts',
  grep: /SavedView stale/,
  use: { ...taskConfig.use, baseURL },
  projects: (['chromium', 'firefox', 'webkit'] as const).flatMap(browserName => [
    { name: `${browserName}-desktop`, use: { browserName, viewport: { width: 1440, height: 1000 } } },
    { name: `${browserName}-narrow`, use: { browserName, viewport: { width: 390, height: 844 } } },
  ]),
  webServer: {
    command: `node ../../../node_modules/vite/bin/vite.js --config vite.config.ts --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
