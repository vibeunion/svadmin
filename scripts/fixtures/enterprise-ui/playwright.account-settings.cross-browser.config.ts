import { defineConfig } from '@playwright/test';
import taskConfig from './playwright.task-list.config';

export default defineConfig({
  ...taskConfig,
  grep: /Company profile|Member directory|enterprise connection|enterprise settings|API settings|Security settings|Profile and MFA|Auth field identity|Notification settings/,
  projects: [
    { name: 'webkit-desktop', use: { browserName: 'webkit', viewport: { width: 1440, height: 1000 } } },
    { name: 'webkit-narrow', use: { browserName: 'webkit', viewport: { width: 390, height: 844 } } },
    { name: 'firefox-desktop', use: { browserName: 'firefox', viewport: { width: 1440, height: 1000 } } },
    { name: 'firefox-narrow', use: { browserName: 'firefox', viewport: { width: 390, height: 844 } } },
  ],
});
