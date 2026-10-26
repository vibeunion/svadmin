import { defineConfig } from '@playwright/test';
import taskConfig from './playwright.task-list.config';

export default defineConfig({
  ...taskConfig,
  grep: /Notification settings/,
  projects: (['chromium', 'firefox', 'webkit'] as const).flatMap(browserName => [
    { name: `${browserName}-desktop`, use: { browserName, viewport: { width: 1440, height: 1000 } } },
    { name: `${browserName}-narrow`, use: { browserName, viewport: { width: 390, height: 844 } } },
  ]),
});
