import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.EVIDENCE_BASE_URL ?? 'http://127.0.0.1:5174';
const out = 'docs/pr-evidence/devtools-20260920';

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const vp of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(vp);
    await page.goto(`${base}/#/login`);
    await page.locator('#login-identifier').fill('admin@example.com');
    await page.locator('#login-password').fill('demo');
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(/#\/$/, { timeout: 15000 });
    await page.waitForFunction(
      () => typeof window.__SVADMIN_DEVTOOLS__ !== 'undefined',
      undefined,
      { timeout: 15000 },
    );
    await page.keyboard.press('Control+Shift+d');
    await page.getByText('svadmin DevTools').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(800);
    const snapshot = await page.evaluate(() => window.__SVADMIN_DEVTOOLS__?.getSnapshot());
    console.info(`viewport ${vp.width}x${vp.height} snapshot version=${snapshot?.version}`);
    await mkdir(out, { recursive: true });
    await page.screenshot({ path: `${out}/devtools-${vp.width}x${vp.height}.png` });
  }
} finally {
  await browser.close();
}
