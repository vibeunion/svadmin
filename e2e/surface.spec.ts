import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

test.describe.configure({ timeout: 90_000 });

async function login(page: import('@playwright/test').Page) {
  await page.goto('/#/login');
  await page.locator('#login-identifier').fill('admin@example.com');
  await page.locator('#login-password').fill('demo');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/#\/$/, { timeout: 10_000 });
}

async function expectSurfaceLayout(page: import('@playwright/test').Page) {
  const result = await page.locator('[data-surface-id="dashboard-declarative-surface"]').evaluate((surface) => {
    const widgets = [...surface.querySelectorAll<HTMLElement>('[data-testid^="surface-widget-"]')];
    const scrollContainers = [...surface.querySelectorAll<HTMLElement>('*')].filter((element) => {
      const overflowX = getComputedStyle(element).overflowX;
      return overflowX === 'auto' || overflowX === 'scroll';
    });
    const hasOverlap = widgets.some((widget, index) => {
      const left = widget.getBoundingClientRect();
      return widgets.slice(index + 1).some((candidate) => {
        const right = candidate.getBoundingClientRect();
        const horizontal = left.left < right.right && left.right > right.left;
        const vertical = left.top < right.bottom && left.bottom > right.top;
        return horizontal && vertical;
      });
    });
    return {
      hasOverlap,
      hasHorizontalOverflow: surface.scrollWidth > surface.clientWidth + 1
        || scrollContainers.some((element) => element.scrollWidth > element.clientWidth + 1),
    };
  });

  expect(result).toEqual({ hasOverlap: false, hasHorizontalOverflow: false });
}

test('renders, refreshes, and remains responsive without recreating widgets', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await login(page);

  const example = page.locator('[data-declarative-surface-example]');
  await expect(example).toBeVisible({ timeout: 30_000 });
  await expect(example.getByRole('heading', { name: 'Declarative Surface' })).toBeVisible();
  await expect(example.getByRole('table', { name: 'Read-only sales orders' })).toBeVisible();
  await expect(example.getByRole('img', { name: 'Inventory by product' })).toBeVisible();
  await expect(example.getByRole('img', { name: 'Order value over time' })).toBeVisible();

  const metricWidget = example.getByTestId('surface-widget-surface-product-count');
  const beforeRefresh = await metricWidget.elementHandle();
  await example.getByRole('button', { name: 'Refresh Surface' }).click();
  await expect(example.getByRole('button', { name: 'Refresh Surface' })).toBeEnabled();
  const afterRefresh = await metricWidget.elementHandle();
  expect(await beforeRefresh?.evaluate((node, current) => node === current, afterRefresh)).toBe(true);

  await expectSurfaceLayout(page);
  const screenshotDirectory = process.env.SURFACE_SCREENSHOT_DIR;
  if (screenshotDirectory) {
    await mkdir(screenshotDirectory, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 1600 });
    await example.scrollIntoViewIfNeeded();
    await example.screenshot({ path: join(screenshotDirectory, 'surface-desktop.png'), animations: 'disabled' });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await example.scrollIntoViewIfNeeded();
  await expectSurfaceLayout(page);
  if (screenshotDirectory) {
    await page.setViewportSize({ width: 390, height: 1400 });
    await example.scrollIntoViewIfNeeded();
    await example.screenshot({ path: join(screenshotDirectory, 'surface-mobile.png'), animations: 'disabled' });
  }
  expect(consoleErrors).toEqual([]);
});
