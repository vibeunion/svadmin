import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshotDirectory = resolve(
  process.cwd(),
  'output/playwright/multitab-state-browser-20261022',
);
const CONTROLLED_STORAGE_PREFIX = 'b3-09-fixture:';

test.beforeEach(async ({ page }) => {
  await page.goto('/?view=multi-tab-state');
});

async function setScroll(page: Page, value: number): Promise<void> {
  await page.getByTestId('multi-tab-scroll').evaluate((element, next) => {
    element.scrollTop = next;
    element.dispatchEvent(new Event('scroll'));
  }, value);
}

async function scrollTop(page: Page): Promise<number> {
  return page.getByTestId('multi-tab-scroll').evaluate((element) => element.scrollTop);
}

async function controlledStorageKeys(page: Page): Promise<string[]> {
  return page.evaluate((prefix) => (
    Object.keys(window.sessionStorage).filter((key) => key.startsWith(prefix)).sort()
  ), CONTROLLED_STORAGE_PREFIX);
}

async function screenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: resolve(screenshotDirectory, `${testInfo.project.name}-${name}.png`),
    fullPage: true,
  });
}

test('MultiTabKeepAlive keeps per-tab state, draft protection and cleared snapshots', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const state = page.getByTestId('mt-state');
  const query = page.getByLabel('Workspace query');
  const scroller = page.getByTestId('multi-tab-scroll');

  await expect(state).toHaveAttribute('data-active-tab', 'orders');
  await expect(state).toHaveAttribute('data-tab-count', '3');
  await expect(page.getByRole('tab', { name: 'Orders' })).toHaveAttribute('aria-selected', 'true');

  // Orders 自己的查询和滚动。
  await query.fill('status=open');
  await setScroll(page, 140);
  await expect(state).toHaveAttribute('data-query', 'status=open');
  await expect(state).toHaveAttribute('data-scroll-top', '140');
  expect(await scrollTop(page)).toBe(140);

  // 切到 Mail，不继承 Orders 状态。
  await page.getByRole('tab', { name: 'Mail' }).click();
  await expect(state).toHaveAttribute('data-active-tab', 'mail');
  await expect(state).toHaveAttribute('data-query', '');
  await expect(state).toHaveAttribute('data-scroll-top', '0');
  expect(await scrollTop(page)).toBe(0);

  await query.fill('unread=1');
  await setScroll(page, 64);
  await expect(state).toHaveAttribute('data-query', 'unread=1');
  await expect(state).toHaveAttribute('data-scroll-top', '64');

  // 草稿标签也保存自己的快照。
  await page.getByRole('tab', { name: 'Invoice draft' }).click();
  await expect(state).toHaveAttribute('data-active-tab', 'invoice');
  await expect(state).toHaveAttribute('data-query', '');
  await expect(state).toHaveAttribute('data-scroll-top', '0');
  await query.fill('invoice=draft');
  await setScroll(page, 80);
  await expect(state).toHaveAttribute('data-query', 'invoice=draft');
  await expect(state).toHaveAttribute('data-scroll-top', '80');

  // 切回 Orders / Mail，各自恢复且互不串。
  await page.getByRole('tab', { name: 'Orders' }).click();
  await expect(state).toHaveAttribute('data-active-tab', 'orders');
  await expect(state).toHaveAttribute('data-query', 'status=open');
  await expect(state).toHaveAttribute('data-scroll-top', '140');
  expect(await scrollTop(page)).toBe(140);

  await page.getByRole('tab', { name: 'Mail' }).click();
  await expect(state).toHaveAttribute('data-active-tab', 'mail');
  await expect(state).toHaveAttribute('data-query', 'unread=1');
  await expect(state).toHaveAttribute('data-scroll-top', '64');
  expect(await scrollTop(page)).toBe(64);

  const populatedKeys = await controlledStorageKeys(page);
  expect(populatedKeys).toHaveLength(3);
  expect(populatedKeys.every((key) => key.startsWith(CONTROLLED_STORAGE_PREFIX))).toBe(true);

  // 冻结标签数组/对象后，草稿关闭保护仍应生效。
  await page.getByTestId('freeze-tabs').click();
  await expect(state).toHaveAttribute('data-frozen', 'true');

  await page.getByRole('button', { name: 'Close Invoice draft' }).click();
  await expect(page.getByRole('tab', { name: 'Invoice draft' })).toBeVisible();
  await expect(state).toHaveAttribute('data-tab-count', '3');
  await expect(state).toHaveAttribute('data-active-tab', 'mail');
  await expect(state).toHaveAttribute('data-invoice-draft', 'true');
  await screenshot(page, testInfo, 'draft-protected');

  // 清除草稿标记后同一关闭入口可关闭，并删除该标签的受控 session storage 快照。
  await page.getByTestId('clear-invoice-draft').click();
  await expect(state).toHaveAttribute('data-invoice-draft', 'false');
  await page.getByRole('button', { name: 'Close Invoice draft' }).click();
  await expect(page.getByRole('tab', { name: 'Invoice draft' })).toHaveCount(0);
  await expect(state).toHaveAttribute('data-tab-count', '2');
  await expect(state).toHaveAttribute('data-active-tab', 'mail');
  expect(await controlledStorageKeys(page)).toHaveLength(2);

  // 重开同 id 标签不恢复旧查询/滚动快照。
  await page.getByTestId('reopen-invoice').click();
  await expect(state).toHaveAttribute('data-active-tab', 'invoice');
  await expect(state).toHaveAttribute('data-tab-count', '3');
  await expect(state).toHaveAttribute('data-query', '');
  await expect(state).toHaveAttribute('data-scroll-top', '0');
  expect(await scrollTop(page)).toBe(0);

  // 其他标签的旧快照仍独立保留。
  await page.getByRole('tab', { name: 'Orders' }).click();
  await expect(state).toHaveAttribute('data-active-tab', 'orders');
  await expect(state).toHaveAttribute('data-query', 'status=open');
  await expect(state).toHaveAttribute('data-scroll-top', '140');

  await page.getByRole('tab', { name: 'Mail' }).click();
  await expect(state).toHaveAttribute('data-active-tab', 'mail');
  await expect(state).toHaveAttribute('data-query', 'unread=1');
  await expect(state).toHaveAttribute('data-scroll-top', '64');

  await screenshot(page, testInfo, 'reopened-invoice');
  expect(errors).toEqual([]);
});