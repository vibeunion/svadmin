import { defineConfig } from '@playwright/test';
import taskConfig from './playwright.task-list.config';

const baseURL = 'http://127.0.0.1:4192';

export default defineConfig({
  ...taskConfig,
  testMatch: 'resource-workspace-edit-route.spec.ts',
  grep: /ResourceWorkspace/,
  use: { ...taskConfig.use, baseURL },
  webServer: {
    command: 'node ../../../node_modules/vite/bin/vite.js --config vite.config.ts --host 127.0.0.1 --port 4192 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium-desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } } },
  ],
});