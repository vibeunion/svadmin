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
      hasVerticalOverflow: surface.scrollHeight > surface.clientHeight + 1,
    };
  });

  expect(result).toEqual({
    hasOverlap: false,
    hasHorizontalOverflow: false,
    hasVerticalOverflow: false,
  });
}

async function fitSurfaceScreenshotViewport(
  page: import('@playwright/test').Page,
  example: import('@playwright/test').Locator,
  width: number,
): Promise<void> {
  await page.setViewportSize({ width, height: 1200 });
  await example.evaluate((element) => element.scrollIntoView({ block: 'start' }));
  for (let layoutPass = 0; layoutPass < 4; layoutPass += 1) {
    const surfaceHeight = await example.evaluate((element) => Math.ceil(
      Math.max(element.getBoundingClientRect().height, element.scrollHeight),
    ));
    await page.setViewportSize({ width, height: surfaceHeight + 32 });
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
  }
  await example.evaluate((element) => element.scrollIntoView({ block: 'start' }));
}

test('versions, reviews, refreshes, and remains responsive without recreating widgets', async ({ page }) => {
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
  const revisionStatus = example.locator('[data-surface-revision]');
  await expect(revisionStatus).toContainText('revision 1 · history 1');

  const metricWidget = example.getByTestId('surface-widget-surface-product-count');
  const beforeRefresh = await metricWidget.elementHandle();
  await example.getByRole('button', { name: 'Refresh Surface' }).click();
  await expect(example.getByRole('button', { name: 'Refresh Surface' })).toBeEnabled();
  const afterRefresh = await metricWidget.elementHandle();
  expect(await beforeRefresh?.evaluate((node, current) => node === current, afterRefresh)).toBe(true);

  await example.getByRole('button', { name: 'Save draft' }).click();
  await expect(revisionStatus).toContainText('revision 2 · history 2 · draft r2');
  await expect(example.getByRole('heading', { name: 'Declarative Surface draft 2' })).toBeVisible();

  await example.getByRole('button', { name: 'Publish' }).click();
  await expect(revisionStatus).toContainText('revision 3 · history 3 · published r3');

  await example.getByRole('button', { name: 'Agent proposal' }).click();
  const proposal = example.locator('[data-surface-proposal]');
  await expect(proposal).toBeVisible();
  await expect(proposal.locator('[data-status]')).toHaveAttribute('data-status', 'pending');
  await expect(revisionStatus).toContainText('revision 3 · history 3 · proposal pending');
  await proposal.getByRole('button', { name: 'Approve proposal' }).click();
  await expect(proposal.locator('[data-status]')).toHaveAttribute('data-status', 'applied');
  await expect(revisionStatus).toContainText('revision 4 · history 4 · applied r4');
  await expect(example.getByRole('heading', { name: 'Agent-reviewed Surface' })).toBeVisible();

  const beforeAction = await metricWidget.elementHandle();
  await example.getByRole('button', { name: 'Low stock filter' }).click();
  await expect(revisionStatus).toContainText('setFilter');
  const afterAction = await metricWidget.elementHandle();
  expect(await beforeAction?.evaluate((node, current) => node === current, afterAction)).toBe(true);
  await example.getByRole('button', { name: 'Clear filter' }).click();
  await expect(revisionStatus).toContainText('clearFilter');

  await example.getByRole('button', { name: 'Simulate live event' }).click();
  await expect(revisionStatus).toContainText('live refresh queued');

  await example.getByRole('button', { name: 'Rollback to r1' }).click();
  await expect(revisionStatus).toContainText('revision 5 · history 5 · draft r5');
  await expect(example.getByRole('heading', { name: 'Declarative Surface' })).toBeVisible();

  await expectSurfaceLayout(page);
  const screenshotDirectory = process.env.SURFACE_SCREENSHOT_DIR;
  if (screenshotDirectory) {
    await mkdir(screenshotDirectory, { recursive: true });
    await fitSurfaceScreenshotViewport(page, example, 1440);
    await example.screenshot({ path: join(screenshotDirectory, 'surface-desktop.png'), animations: 'disabled' });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await example.evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await expectSurfaceLayout(page);
  if (screenshotDirectory) {
    await fitSurfaceScreenshotViewport(page, example, 390);
    await example.screenshot({ path: join(screenshotDirectory, 'surface-mobile.png'), animations: 'disabled' });
  }
  expect(consoleErrors).toEqual([]);
});
