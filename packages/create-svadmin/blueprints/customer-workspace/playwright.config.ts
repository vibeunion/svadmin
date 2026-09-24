import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:5198', trace: 'retain-on-failure', reducedMotion: 'reduce' },
  webServer: {
    command: 'bun run dev --host 127.0.0.1 --port 5198 --strictPort',
    url: 'http://127.0.0.1:5198',
    reuseExistingServer: false,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
