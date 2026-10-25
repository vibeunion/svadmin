import { defineConfig } from '@playwright/test';
import permissionConfig from './playwright.permission-matrix.config';

export default defineConfig({
  ...permissionConfig,
  testMatch: 'date-time-keyboard.spec.ts',
  grep: /date\/time keyboard/,
  projects: (['chromium', 'webkit', 'firefox'] as const).map(browserName => ({
    name: `${browserName}-desktop`,
    use: { browserName, viewport: { width: 1440, height: 1000 } },
  })),
});