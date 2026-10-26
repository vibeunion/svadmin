import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshotDirectory = resolve(process.cwd(), 'output/playwright/saved-view-stale-fields-browser-20261024');

const searchableFields = ['email', 'team'];

function expectedProviderQuery(value: string) {
  return {
    filters: [{
      operator: 'or',
      value: searchableFields.map(field => ({ field, operator: 'contains', value })),
    }],
    sorters: [],
    pagination: { current: 1, pageSize: 10 },
  };
}

const expectedScope = {
  resourceName: 'saved-view-records',
  providerName: 'default',
};

// 双语 regex 只是容错匹配，不代表本矩阵跑过双 locale；实际运行语言在用例内记录。
const twoStaleFields = /(Ignored 2 unavailable field|已忽略 2 个失效字段)/;
const oneStaleField = /(Ignored 1 unavailable field|已忽略 1 个失效字段)/;

async function readLog<T>(page: Page, testId: string): Promise<T[]> {
  const text = await page.getByTestId(testId).textContent();
  return JSON.parse(text ?? '[]') as T[];
}

async function waitForQuery(page: Page, value: string): Promise<void> {
  await expect.poll(async () => {
    const calls = await readLog<{ filters: unknown }>(page, 'saved-list-views-query-calls');
    return calls.at(-1) ?? {};
  }).toEqual(expectedProviderQuery(value));
}

async function openViewsWithKeyboard(page: Page) {
  const views = page.getByRole('button', { name: /^(Views|视图)$/, exact: true });
  await expect(views).toBeEnabled();
  await views.focus();
  await views.press('Enter');
  const popover = page.locator('.svadmin-popover-content');
  await expect(popover).toBeVisible();
  await popover.evaluate(async element => {
    await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => undefined)));
  });
  return popover;
}

// macOS WebKit 在宿主未启用全键盘访问时用 Alt+Tab 遍历全部控件；其他平台沿用 Tab。
// 这里只按真实键盘序列移动焦点，不直接 focus 弹层内部控件。
function traversalKeys(browserName: string) {
  const allControls = browserName === 'webkit' && process.platform === 'darwin';
  return {
    forward: allControls ? 'Alt+Tab' : 'Tab',
    backward: allControls ? 'Alt+Shift+Tab' : 'Shift+Tab',
  };
}

async function pressUntilFocused(
  page: Page,
  key: string,
  target: ReturnType<Page['locator']>,
  maxAttempts = 20,
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await page.keyboard.press(key);
    if (await target.evaluate(element => element === document.activeElement)) return;
  }
  await expect(target).toBeFocused();
}

function staleStatus(popover: ReturnType<Page['locator']>) {
  return popover.getByRole('status').filter({ hasText: /(Ignored|已忽略)/ });
}

async function localSavedViewStorageKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => Object.keys(localStorage)
    .filter(key => key.startsWith('svadmin-list-views-v2-')));
}

async function expectNarrowControlsInViewport(
  page: Page,
  testInfo: TestInfo,
  controls: Array<{ name: string; locator: ReturnType<Page['locator']> }>,
): Promise<void> {
  if (!testInfo.project.name.endsWith('narrow')) return;
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  for (const control of controls) {
    await expect(control.locator, control.name).toBeVisible();
    const box = await control.locator.boundingBox();
    expect(box, control.name).not.toBeNull();
    expect(box?.x ?? -1, control.name).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0), control.name).toBeLessThanOrEqual(viewport?.width ?? 0);
    expect(box?.y ?? -1, control.name).toBeGreaterThanOrEqual(0);
    expect((box?.y ?? 0) + (box?.height ?? 0), control.name).toBeLessThanOrEqual(viewport?.height ?? 0);
  }
}

async function saveScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: resolve(screenshotDirectory, `${testInfo.project.name}-${name}.png`),
    fullPage: true,
  });
}

test('SavedView stale hint stays hidden when no saved view references a missing column', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=saved-list-views&seed=remote');
  const popover = await openViewsWithKeyboard(page);

  await expect.poll(async () => (await readLog(page, 'saved-list-views-list-calls')).length).toBe(1);
  await expect(page.locator('#saved-list-view option', { hasText: 'Team saved' })).toHaveCount(1);
  await expect(page.locator('#saved-list-view option', { hasText: 'System saved' })).toHaveCount(1);
  await expect(popover.getByRole('status')).toHaveCount(0);
  expect(await readLog(page, 'saved-list-views-save-calls')).toEqual([]);
  expect(await readLog(page, 'saved-list-views-write-calls')).toEqual([]);

  await expectNarrowControlsInViewport(page, testInfo, [
    { name: 'views form', locator: popover },
    { name: 'view select', locator: page.locator('#saved-list-view') },
    { name: 'view name', locator: page.getByLabel(/^(View name|视图名称)$/) },
    { name: 'save view', locator: page.getByRole('button', { name: /^(Save|保存)$/, exact: true }) },
  ]);
  await saveScreenshot(page, testInfo, 'no-stale-fields');
  expect(errors).toEqual([]);
});

test('SavedView stale hint counts missing columns, keeps queries valid, and clears after remove and by-name overwrite', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=saved-list-views&seed=stale');
  const popover = await openViewsWithKeyboard(page);
  const hint = staleStatus(popover);

  await expect.poll(async () => (await readLog(page, 'saved-list-views-list-calls')).length).toBe(1);
  await expect(page.locator('#saved-list-view option', { hasText: 'Stale visibility view' })).toHaveCount(1);
  await expect(page.locator('#saved-list-view option', { hasText: 'Stale order view' })).toHaveCount(1);
  await expect(hint).toHaveCount(1);
  await expect(hint).toHaveText(twoStaleFields);

  // 记录本次 fixture 的真实运行语言与提示原文，避免把双语 regex 误读为双 locale 验收。
  const runtimeLocale = await page.evaluate(() => navigator.language);
  const runtimeHintText = (await hint.textContent())?.trim() ?? '';
  await testInfo.attach('fixture-runtime-locale.json', {
    body: JSON.stringify({ locale: runtimeLocale, hint: runtimeHintText }, null, 2),
    contentType: 'application/json',
  });

  // 真实 UI 应用两个视图后，provider 查询仍然只使用有效字段。
  const viewSelect = page.locator('#saved-list-view');
  await viewSelect.selectOption({ label: 'Stale visibility view' });
  await waitForQuery(page, 'stale-visibility');
  await viewSelect.selectOption({ label: 'Stale order view' });
  await waitForQuery(page, 'stale-order');
  await expect(hint).toHaveText(twoStaleFields);

  // 仅加载和应用不得改写提供方存储或本地视图存储。
  expect(await localSavedViewStorageKeys(page)).toEqual([]);
  expect(await readLog(page, 'saved-list-views-save-calls')).toEqual([]);
  expect(await readLog(page, 'saved-list-views-write-calls')).toEqual([]);
  expect(await readLog(page, 'saved-list-views-list-calls')).toHaveLength(1);

  // 删除按钮、提示与弹层均在删除前纳入 narrow 几何断言。
  const deleteVisibilityView = popover.getByRole('button', { name: /^(Delete|删除) Stale visibility view$/ });
  await expectNarrowControlsInViewport(page, testInfo, [
    { name: 'views form', locator: popover },
    { name: 'stale hint', locator: hint },
    { name: 'delete stale visibility view', locator: deleteVisibilityView },
    { name: 'view select', locator: viewSelect },
    { name: 'view name', locator: page.getByLabel(/^(View name|视图名称)$/) },
    { name: 'save view', locator: page.getByRole('button', { name: /^(Save|保存)$/, exact: true }) },
  ]);
  await saveScreenshot(page, testInfo, 'two-stale-fields');

  // 真实键盘激活删除按钮，提示从 2 个失效字段降为 1 个。
  // 注意：focus + Enter 只证明可达键盘激活，不证明完整 Tab 顺序。
  await expect(deleteVisibilityView).toBeEnabled();
  await deleteVisibilityView.focus();
  await deleteVisibilityView.press('Enter');
  await expect.poll(async () => (await readLog(page, 'saved-list-views-write-calls')).length).toBe(1);
  await expect(hint).toHaveCount(1);
  await expect(hint).toHaveText(oneStaleField);
  await expect(page.locator('#saved-list-view option', { hasText: 'Stale visibility view' })).toHaveCount(0);
  expect(await readLog(page, 'saved-list-views-write-calls')).toEqual([{
    type: 'remove',
    input: { id: 'stale-visibility-view', expectedVersion: 4 },
  }]);

  // 按名称覆盖剩余视图，保存载荷必须携带读取到的版本且不再含失效列。
  await page.getByLabel(/^(View ownership|视图归属)$/).selectOption('team');
  const name = page.getByLabel(/^(View name|视图名称)$/);
  await name.fill('Stale order view');
  await expect(name).toHaveValue('Stale order view');
  const save = page.getByRole('button', { name: /^(Save|保存)$/, exact: true });
  await expect(save).toBeEnabled();
  await save.press('Enter');
  await expect.poll(async () => (await readLog(page, 'saved-list-views-save-calls')).length).toBe(1);
  await expect.poll(async () => hint.count()).toBe(0);
  await expect(page.locator('#saved-list-view option', { hasText: 'Stale order view' })).toHaveCount(1);

  const saves = await readLog<{
    scope: Record<string, unknown>;
    mutation: {
      id: string;
      name: string;
      source: string;
      expectedVersion: number | null;
      state: {
        search: string;
        filters: unknown[];
        sorters: unknown[];
        pagination: { current: number; pageSize: number };
        columnVisibility: Record<string, boolean>;
        columnOrder: string[];
      };
    };
  }>(page, 'saved-list-views-save-calls');
  expect(saves).toHaveLength(1);
  expect(saves[0]).toEqual({
    scope: expectedScope,
    mutation: {
      id: 'stale-order-view',
      name: 'Stale order view',
      source: 'team',
      expectedVersion: 7,
      state: {
        search: 'stale-order',
        filters: [],
        sorters: [],
        pagination: { current: 1, pageSize: 10 },
        columnVisibility: {},
        columnOrder: ['team', 'id', 'email'],
      },
    },
  });
  expect(JSON.stringify(saves[0]?.mutation.state)).not.toContain('legacyTeam');

  await expectNarrowControlsInViewport(page, testInfo, [
    { name: 'views form', locator: popover },
    { name: 'view select', locator: viewSelect },
    { name: 'view name', locator: name },
    { name: 'save view', locator: save },
  ]);
  await saveScreenshot(page, testInfo, 'stale-cleared');
  expect(errors).toEqual([]);
});

test('SavedView stale popover keeps real keyboard traversal and returns focus to the trigger', async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=saved-list-views&seed=stale');
  const popover = await openViewsWithKeyboard(page);
  const { forward, backward } = traversalKeys(browserName);

  // 打开后由组件自动聚焦，等待焦点稳定，不额外按 Tab 才进入。
  const ownership = page.getByLabel(/^(View ownership|视图归属)$/);
  await expect(ownership).toBeFocused();

  const currentView = page.locator('#saved-list-view');
  const name = page.getByLabel(/^(View name|视图名称)$/);
  const firstDefault = popover.getByRole('button', { name: /^(Set as default view|设为默认视图) Stale visibility view$/ });
  const firstAccess = popover.getByLabel(/^(View visibility|视图可见范围) Stale visibility view$/);
  const firstDelete = popover.getByRole('button', { name: /^(Delete|删除) Stale visibility view$/ });
  const lastDelete = popover.getByRole('button', { name: /^(Delete|删除) Stale order view$/ });

  // 有界正向遍历：实际经过当前视图、name、默认按钮、access 选择、删除按钮，再回到 ownership。
  await pressUntilFocused(page, forward, currentView);
  await pressUntilFocused(page, forward, name);
  await pressUntilFocused(page, forward, firstDefault);
  await pressUntilFocused(page, forward, firstAccess);
  await pressUntilFocused(page, forward, firstDelete);
  await pressUntilFocused(page, forward, ownership);

  // 反向从 ownership 回到弹层最后一个控件，确认反向真实可达。
  await page.keyboard.press(backward);
  await expect(lastDelete).toBeFocused();

  // Escape 关闭弹层并把焦点交还 Views 触发按钮。
  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
  await expect(page.getByRole('button', { name: /^(Views|视图)$/, exact: true })).toBeFocused();
  expect(errors).toEqual([]);
});
