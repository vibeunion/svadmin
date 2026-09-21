import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function login(page: Page): Promise<void> {
  await page.goto('/#/login');
  await page.locator('#login-identifier').fill('admin@example.com');
  await page.locator('#login-password').fill('demo');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/#\/$/);
}

async function expectDesktopGeometry(
  page: Page,
  direction: 'ltr' | 'rtl',
  viewportWidth: number,
  sidebarWidth: 252 | 70,
): Promise<void> {
  const sidebar = page.getByRole('complementary', { name: 'Sidebar navigation', exact: true });
  const main = page.getByRole('main');
  await expect(sidebar).toHaveCSS('width', `${sidebarWidth}px`);
  // 检查可见内容边界，不依赖布局容器属性或 margin 的实现方式。
  await expect.poll(async () => {
    const a = await sidebar.boundingBox();
    const b = await main.boundingBox();
    if (!a || !b || a.height <= 0 || b.height <= 0) return null;
    return {
      sidebarLeft: Math.round(a.x),
      sidebarRight: Math.round(a.x + a.width),
      mainLeft: Math.round(b.x),
      mainRight: Math.round(b.x + b.width),
      mainWidth: Math.round(b.width),
      nonOverlapping: direction === 'ltr'
        ? b.x >= a.x + a.width - 1
        : b.x + b.width <= a.x + 1,
    };
  }).toEqual({
    sidebarLeft: direction === 'ltr' ? 0 : viewportWidth - sidebarWidth,
    sidebarRight: direction === 'ltr' ? sidebarWidth : viewportWidth,
    mainLeft: direction === 'ltr' ? sidebarWidth : 0,
    mainRight: direction === 'ltr' ? viewportWidth : viewportWidth - sidebarWidth,
    mainWidth: viewportWidth - sidebarWidth,
    nonOverlapping: true,
  });
}

for (const direction of ['ltr', 'rtl'] as const) {
  for (const width of [1440, 1920]) {
    test(`native sidebar geometry at ${width}px in ${direction}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1080 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await login(page);
      await page.evaluate(dir => { document.documentElement.dir = dir; }, direction);
      const sidebar = page.getByRole('complementary', { name: 'Sidebar navigation', exact: true });
      const main = page.getByRole('main');
      await expect(sidebar).toHaveCount(1);
      await expect(main).toHaveCount(1);
      await expectDesktopGeometry(page, direction, width, 252);
      await sidebar.getByRole('button', { name: /Toggle sidebar|切换侧边栏/ }).click();
      await expectDesktopGeometry(page, direction, width, 70);
      await page.screenshot({ path: testInfo.outputPath('screenshots', `native-sidebar-${width}-${direction}.png`), fullPage: false });
      await sidebar.getByRole('button', { name: /Toggle sidebar|切换侧边栏/ }).click();
      await expectDesktopGeometry(page, direction, width, 252);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(sidebar).toHaveCount(0);
      await expect.poll(async () => {
        const box = await main.boundingBox();
        return box ? { left: Math.round(box.x), right: Math.round(box.x + box.width) } : null;
      }).toEqual({ left: 0, right: 390 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      // Restore desktop to prove resize does not lose the expanded state.
      await page.setViewportSize({ width, height: 1080 });
      await expectDesktopGeometry(page, direction, width, 252);
    });
  }
}
