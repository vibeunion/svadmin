import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function login(page: Page): Promise<void> {
  await page.goto('/#/login');
  await page.locator('#login-identifier').fill('admin@example.com');
  await page.locator('#login-password').fill('demo');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/#\/$/);
}

for (const direction of ['ltr', 'rtl'] as const) {
  for (const width of [1440, 1920]) {
    test(`native sidebar geometry at ${width}px in ${direction}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1080 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await login(page);
      await page.evaluate(dir => { document.documentElement.dir = dir; }, direction);
      const sidebar = page.locator('[data-svadmin-sidebar]:visible');
      const frame = page.locator('[data-svadmin-content-frame]');
      await expect(sidebar).toHaveCount(1);
      await expect(sidebar).toHaveCSS('width', '252px');
      await expect(frame).toHaveCSS('margin-inline-start', '252px');
      await expect(frame).toHaveCSS('margin-inline-end', '0px');
      await sidebar.getByRole('button', { name: /Toggle sidebar|切换侧边栏/ }).click();
      await expect(sidebar).toHaveCSS('width', '70px');
      await expect(frame).toHaveCSS('margin-inline-start', '70px');
      // Verify geometry, not just classes or computed margins.
      await expect.poll(async () => {
        const a = await sidebar.boundingBox();
        const b = await frame.boundingBox();
        if (!a || !b) return false;
        return direction === 'ltr' ? b.x >= a.x + a.width - 1 : b.x + b.width <= a.x + 1;
      }).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('screenshots', `native-sidebar-${width}-${direction}.png`), fullPage: false });
      await sidebar.getByRole('button', { name: /Toggle sidebar|切换侧边栏/ }).click();
      await expect(sidebar).toHaveCSS('width', '252px');
      await expect(frame).toHaveCSS('margin-inline-start', '252px');
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(frame).toHaveCSS('margin-inline-start', '0px');
      await expect(frame).toHaveCSS('margin-inline-end', '0px');
      await expect(page.locator('[data-svadmin-sidebar]:visible')).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      // Restore desktop to prove resize does not lose the expanded state.
      await page.setViewportSize({ width, height: 1080 });
      await expect(sidebar).toHaveCSS('width', '252px');
      await expect(frame).toHaveCSS('margin-inline-start', '252px');
    });
  }
}
