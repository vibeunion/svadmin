import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'password-input.spec.ts',
  workers: 1,
  use: {
    browserName: 'webkit',
    baseURL: 'http://127.0.0.1:5196',
    launchOptions: process.env.SVADMIN_WEBKIT_EXECUTABLE_PATH
      ? { executablePath: process.env.SVADMIN_WEBKIT_EXECUTABLE_PATH }
      : undefined,
  },
  outputDir: '../../../output/password-input',
  webServer: {
    command: 'bun x --no-install vite --config vite.config.ts',
    url: 'http://127.0.0.1:5196',
    reuseExistingServer: false,
  },
});
