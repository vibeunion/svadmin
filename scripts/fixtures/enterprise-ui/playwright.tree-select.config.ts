import { defineConfig } from '@playwright/test';
import taskConfig from './playwright.task-list.config';

export default defineConfig({
  ...taskConfig,
  testMatch: 'tree-select.spec.ts',
  grep: /TreeSelect/,
  projects: (['chromium', 'webkit', 'firefox'] as const).flatMap(browserName => [
    { name: `${browserName}-desktop`, use: { browserName, viewport: { width: 1440, height: 1000 } } },
    { name: `${browserName}-narrow`, use: { browserName, viewport: { width: 390, height: 844 } } },
  ]),
});
