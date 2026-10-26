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

function controlledKey(tabId: string): string {
  return `${CONTROLLED_STORAGE_PREFIX}svadmin:workspace-tab-state:v1:tenant-a:anonymous:${tabId}`;
}

function draftUrl(user: string, tenant: string): string {
  const params = new URLSearchParams({
    view: 'multi-tab-state',
    draftPayload: '1',
    user,
    tenant,
  });
  return `/?${params.toString()}`;
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

test('opt-in draft payload restores only after explicit restore and clears on discard', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(draftUrl('user-1', 'tenant-a'));

  const state = page.getByTestId('mt-state');
  const draftInput = page.getByLabel('Draft title');
  await expect(state).toHaveAttribute('data-draft-payload', 'true');
  await expect(draftInput).toHaveValue('');
  await expect(state).toHaveAttribute('data-draft-pending', 'false');
  await expect(page.getByTestId('restore-draft')).toHaveCount(0);

  // 真实输入触发 capture，白名单 title 写入当前用户的受控 storage。
  await draftInput.fill('Invoice draft A');
  await expect(state).toHaveAttribute('data-draft-title', 'Invoice draft A');
  expect(await controlledStorageKeys(page)).toContain(
    `${CONTROLLED_STORAGE_PREFIX}svadmin:workspace-tab-state:v1:tenant-a:user:user-1:invoice`,
  );

  // 刷新后不自动填充，只显示候选；草稿内容来自持久化而非业务 Provider。
  await page.reload();
  await expect(draftInput).toHaveValue('');
  await expect(state).toHaveAttribute('data-draft-pending', 'true');
  await expect(page.getByTestId('restore-draft')).toBeVisible();

  // 明确点击后才把候选填进输入框。
  await page.getByTestId('restore-draft').click();
  await expect(draftInput).toHaveValue('Invoice draft A');
  await expect(page.getByTestId('restore-draft')).toHaveCount(0);

  // Discard 清除持久化草稿，再次刷新也不应出现待确认候选。
  await page.getByTestId('discard-draft').click();
  await expect(draftInput).toHaveValue('');
  await expect(page.getByTestId('restore-draft')).toHaveCount(0);
  await page.reload();
  await expect(state).toHaveAttribute('data-draft-pending', 'false');
  await expect(page.getByTestId('restore-draft')).toHaveCount(0);
  await expect(draftInput).toHaveValue('');

  await screenshot(page, testInfo, 'draft-payload-discarded');
  expect(errors).toEqual([]);
});

test('opt-in draft payload stays isolated across users and tenants', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(draftUrl('user-1', 'tenant-a'));
  await page.getByLabel('Draft title').fill('user-one secret');
  await page.reload();
  await expect(page.getByTestId('restore-draft')).toBeVisible();

  // 另一个用户看不到 user-1 的候选，其存储键也不相同。
  await page.goto(draftUrl('user-2', 'tenant-a'));
  await expect(page.getByLabel('Draft title')).toHaveValue('');
  await expect(page.getByTestId('restore-draft')).toHaveCount(0);

  // 同一用户在另一个租户同样看不到旧草稿。
  await page.goto(draftUrl('user-1', 'tenant-b'));
  await expect(page.getByLabel('Draft title')).toHaveValue('');
  await expect(page.getByTestId('restore-draft')).toHaveCount(0);

  // 回到原身份/租户后仍能明确恢复自己的候选。
  await page.goto(draftUrl('user-1', 'tenant-a'));
  await expect(page.getByTestId('restore-draft')).toBeVisible();
  await page.getByTestId('restore-draft').click();
  await expect(page.getByLabel('Draft title')).toHaveValue('user-one secret');

  await screenshot(page, testInfo, 'draft-payload-identity-isolation');
  expect(errors).toEqual([]);
});

async function expectRovingSelection(page: Page, name: string, id: string): Promise<void> {
  const tab = page.getByRole('tab', { name });
  await expect(tab).toBeFocused();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('mt-state')).toHaveAttribute('data-active-tab', id);

  const state = await page.getByRole('tab').evaluateAll((elements) => ({
    tabStops: elements
      .filter((element) => element.getAttribute('tabindex') === '0')
      .map((element) => element.textContent?.trim() ?? ''),
    selected: elements
      .filter((element) => element.getAttribute('aria-selected') === 'true')
      .map((element) => element.textContent?.trim() ?? ''),
  }));
  expect(state.tabStops).toEqual([name]);
  expect(state.selected).toEqual([name]);
}

test('MultiTabKeepAlive roving tabstop follows real keyboard navigation and restores query state', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const state = page.getByTestId('mt-state');
  const query = page.getByLabel('Workspace query');
  const orders = page.getByRole('tab', { name: 'Orders' });
  const mail = page.getByRole('tab', { name: 'Mail' });

  // 初始 roving tabstop 唯一且落在默认激活的 Orders。
  const initialTabStops = await page.getByRole('tab').evaluateAll((elements) => elements
    .filter((element) => element.getAttribute('tabindex') === '0')
    .map((element) => element.textContent?.trim() ?? ''));
  expect(initialTabStops).toEqual(['Orders']);

  await orders.focus();
  await expectRovingSelection(page, 'Orders', 'orders');

  // 真实按键移动焦点，ArrowRight 从末尾环绕回首个标签。
  await page.keyboard.press('ArrowRight');
  await expectRovingSelection(page, 'Mail', 'mail');
  await page.keyboard.press('End');
  await expectRovingSelection(page, 'Invoice draft', 'invoice');
  await page.keyboard.press('ArrowRight');
  await expectRovingSelection(page, 'Orders', 'orders');
  await page.keyboard.press('ArrowLeft');
  await expectRovingSelection(page, 'Invoice draft', 'invoice');
  await page.keyboard.press('Home');
  await expectRovingSelection(page, 'Orders', 'orders');

  // Enter/Space 保持当前选中，不改变激活标签。
  await page.keyboard.press('Enter');
  await expectRovingSelection(page, 'Orders', 'orders');
  await page.keyboard.press('Space');
  await expectRovingSelection(page, 'Orders', 'orders');

  // 两个标签各写入不同查询，方向键切回后分别恢复自己的快照。
  await query.fill('status=open');
  await expect(state).toHaveAttribute('data-query', 'status=open');
  await orders.press('ArrowRight');
  await expectRovingSelection(page, 'Mail', 'mail');
  await expect(state).toHaveAttribute('data-query', '');

  await query.fill('unread=1');
  await expect(state).toHaveAttribute('data-query', 'unread=1');
  await mail.press('ArrowLeft');
  await expectRovingSelection(page, 'Orders', 'orders');
  await expect(state).toHaveAttribute('data-query', 'status=open');

  await orders.press('ArrowRight');
  await expectRovingSelection(page, 'Mail', 'mail');
  await expect(state).toHaveAttribute('data-query', 'unread=1');

  // 未写入查询的草稿标签保持空快照，避免状态串扰。
  await mail.press('End');
  await expectRovingSelection(page, 'Invoice draft', 'invoice');
  await expect(state).toHaveAttribute('data-query', '');
  await page.keyboard.press('Home');
  await expectRovingSelection(page, 'Orders', 'orders');
  await expect(state).toHaveAttribute('data-query', 'status=open');

  await screenshot(page, testInfo, 'keyboard-roving-state');
  expect(errors).toEqual([]);
});

test('maxTabs=3 evicts only the safe Mail tab through the real openTab entry and clears its snapshot', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/?view=multi-tab-state&maxTabs=3');

  const state = page.getByTestId('mt-state');
  const query = page.getByLabel('Workspace query');

  await expect(state).toHaveAttribute('data-max-tabs', '3');
  await expect(state).toHaveAttribute('data-limit-count', '0');
  await expect(page.getByRole('tab')).toHaveCount(3);

  // Mail 写入查询与滚动后回到 Orders；仅 Mail 是可安全淘汰候选。
  await page.getByRole('tab', { name: 'Mail' }).click();
  await expect(state).toHaveAttribute('data-active-tab', 'mail');
  await query.fill('unread=1');
  await setScroll(page, 64);
  await expect(state).toHaveAttribute('data-query', 'unread=1');
  await expect(state).toHaveAttribute('data-scroll-top', '64');

  await page.getByRole('tab', { name: 'Orders' }).click();
  await expect(state).toHaveAttribute('data-active-tab', 'orders');
  await expect(state).toHaveAttribute('data-query', '');
  expect(await controlledStorageKeys(page)).toContain(controlledKey('mail'));

  // 真实按钮点击进入组件公开入口，不通过 evaluate 调用内部 open。
  await page.getByTestId('open-reports').click();
  await expect(state).toHaveAttribute('data-open-result', 'opened');
  await expect(state).toHaveAttribute('data-open-reason', '');
  await expect(state).toHaveAttribute('data-active-tab', 'reports');

  // Mail 被淘汰，dirty Invoice 与 active Orders 保留。
  await expect(page.getByRole('tab', { name: 'Mail' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Invoice draft' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Orders' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Reports' })).toBeVisible();
  await expect(state).toHaveAttribute('data-tab-count', '3');
  await expect(state).toHaveAttribute('data-invoice-draft', 'true');

  // 淘汰触发 onclose -> adapter.clear，对应受控 sessionStorage 键消失。
  const keysAfterEviction = await controlledStorageKeys(page);
  expect(keysAfterEviction).not.toContain(controlledKey('mail'));
  expect(keysAfterEviction).toContain(controlledKey('orders'));

  // 重开 Mail 不得恢复旧的查询/滚动快照。
  await page.getByTestId('reopen-mail').click();
  await expect(state).toHaveAttribute('data-open-result', 'opened');
  await expect(state).toHaveAttribute('data-active-tab', 'mail');
  await expect(state).toHaveAttribute('data-query', '');
  await expect(state).toHaveAttribute('data-scroll-top', '0');
  expect(await scrollTop(page)).toBe(0);
  expect(await controlledStorageKeys(page)).not.toContain(controlledKey('mail'));

  await screenshot(page, testInfo, 'max-tabs-evicted-mail');
  expect(errors).toEqual([]);
});

test('maxTabs=2 rejects the whole Reports open when two evictions are needed but only one safe candidate exists', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/?view=multi-tab-state&maxTabs=2');

  const state = page.getByTestId('mt-state');
  const query = page.getByLabel('Workspace query');

  await expect(state).toHaveAttribute('data-max-tabs', '2');
  await expect(state).toHaveAttribute('data-limit-count', '0');
  await expect(page.getByRole('tab')).toHaveCount(3);

  // Orders 写查询/滚动，再经 Mail 往返持久化快照，确保拒绝前后可比较。
  await query.fill('status=open');
  await setScroll(page, 140);
  await expect(state).toHaveAttribute('data-query', 'status=open');
  await expect(state).toHaveAttribute('data-scroll-top', '140');

  await page.getByRole('tab', { name: 'Mail' }).click();
  await expect(state).toHaveAttribute('data-active-tab', 'mail');
  await page.getByRole('tab', { name: 'Orders' }).click();
  await expect(state).toHaveAttribute('data-active-tab', 'orders');
  await expect(state).toHaveAttribute('data-query', 'status=open');

  const keysBefore = await controlledStorageKeys(page);

  await page.getByTestId('open-reports').click();
  await expect(state).toHaveAttribute('data-open-result', 'rejected');
  await expect(state).toHaveAttribute('data-open-reason', 'limit-reached');
  await expect(state).toHaveAttribute('data-limit-count', '1');

  // 整次拒绝：标签、激活、查询、滚动与快照均保持不变。
  await expect(page.getByRole('tab')).toHaveCount(3);
  await expect(page.getByRole('tab', { name: 'Reports' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Mail' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Invoice draft' })).toBeVisible();
  await expect(state).toHaveAttribute('data-tab-count', '3');
  await expect(state).toHaveAttribute('data-active-tab', 'orders');
  await expect(state).toHaveAttribute('data-query', 'status=open');
  await expect(state).toHaveAttribute('data-scroll-top', '140');
  expect(await scrollTop(page)).toBe(140);
  expect(await controlledStorageKeys(page)).toEqual(keysBefore);

  await screenshot(page, testInfo, 'max-tabs-rejected');
  expect(errors).toEqual([]);
});
