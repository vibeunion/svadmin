import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshotDirectory = resolve(process.cwd(), 'output/playwright/resource-workspace-browser-20261022');
const searchableFields = ['title', 'team'];

type ListCall = {
  filters: unknown[];
  sorters: unknown[];
  pagination: { current?: number; pageSize?: number } | undefined;
  ids: number[];
  total: number;
  failed: boolean;
};

type UpdateCall = {
  resource: string;
  id: string | number;
  variables: Record<string, unknown>;
  meta: Record<string, unknown>;
};

async function readLog<T>(page: Page, testId: string): Promise<T[]> {
  const text = await page.getByTestId(testId).textContent();
  return JSON.parse(text ?? '[]') as T[];
}

function expectedSearchFilters(value: string): unknown[] {
  return [{
    operator: 'or',
    value: searchableFields.map(field => ({ field, operator: 'contains', value })),
  }];
}

async function lastListCall(page: Page): Promise<ListCall | undefined> {
  return (await readLog<ListCall>(page, 'resource-workspace-list-calls')).at(-1);
}

async function waitForListQuery(page: Page, value: string, current: number): Promise<void> {
  await expect.poll(async () => {
    const call = await lastListCall(page);
    return { filters: call?.filters, pagination: call?.pagination };
  }).toEqual({
    filters: expectedSearchFilters(value),
    pagination: { current, pageSize: 10, mode: undefined },
  });
}

function selectLabel(id: number): RegExp {
  return new RegExp(`^(Select record|选择记录) ${id}$`);
}

function recordFor(page: Page, id: number): Locator {
  const checkbox = page.getByRole('checkbox', { name: selectLabel(id) });
  return checkbox.locator('xpath=ancestor::*[self::tr or (self::div and .//button[@aria-label="More actions" or @aria-label="更多操作"])][1]');
}

async function expectRecordTitle(page: Page, title: string): Promise<void> {
  await expect(page.getByText(title, { exact: true }).filter({ visible: true }).first()).toBeVisible();
}

async function waitForAnimations(locator: Locator): Promise<void> {
  await locator.evaluate(async element => {
    await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => undefined)));
  });
}

async function expectNoNarrowOverflow(page: Page, testInfo: TestInfo): Promise<void> {
  if (!testInfo.project.name.endsWith('narrow')) return;
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function expectNarrowControlsInViewport(
  page: Page,
  testInfo: TestInfo,
  controls: Array<{ name: string; locator: Locator }>,
): Promise<void> {
  if (!testInfo.project.name.endsWith('narrow')) return;
  await expectNoNarrowOverflow(page, testInfo);
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

async function openSecondPage(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Go to next page' }).click();
  await waitForListQuery(page, 'needle', 2);
  await expectRecordTitle(page, 'needle item 11');
}

async function openQuickEdit(page: Page, id: number, expectedTitle: string, expectedLabel = `Browser records`) {
  const row = recordFor(page, id);
  await row.getByRole('button', { name: /^(More actions|更多操作)$/ }).click();
  const menu = page.getByRole('menu', { name: /More actions|更多操作/ });
  await expect(menu).toBeVisible();
  await waitForAnimations(menu);
  await menu.getByRole('menuitem', { name: /^(Quick edit|快速编辑)$/ }).click();
  const drawer = page.getByRole('dialog', { name: new RegExp(expectedLabel) });
  await expect(drawer).toBeVisible();
  await waitForAnimations(drawer);
  const title = drawer.getByRole('textbox', { name: /^(Title|标题)$/ });
  await expect(title).toHaveValue(expectedTitle);
  const save = drawer.getByRole('button', { name: /^(Save|保存)$/ });
  return { drawer, title, save };
}

test('ResourceWorkspace keeps a deferred quick-edit save open across close, Escape, overlay and Cancel without duplicated updates', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=resource-workspace&deferred=hold');

  await expectRecordTitle(page, 'needle item 1');
  const { drawer, title, save } = await openQuickEdit(page, 1, 'needle item 1');
  await title.fill('pending draft title');
  await save.click();
  await expect.poll(async () => (await readLog<UpdateCall>(page, 'resource-workspace-update-calls')).length).toBe(1);
  await expect(save).toBeDisabled();

  const close = drawer.getByRole('button', { name: /^(Close|关闭)$/ });
  await close.click();
  await expect(drawer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeVisible();
  const overlay = page.locator('.svadmin-sheet-overlay');
  if (testInfo.project.name.endsWith('narrow')) {
    // The narrow Drawer intentionally fills the viewport, so there is no
    // pointer-hit area outside the panel; exercise the overlay handler directly.
    await overlay.dispatchEvent('click');
  } else {
    await overlay.click({ position: { x: 5, y: 160 } });
  }
  await expect(drawer).toBeVisible();
  const cancel = drawer.getByRole('button', { name: /^(Cancel|取消)$/ });
  await expect(cancel).toBeVisible();
  await cancel.click();
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('alert')).toHaveCount(0);
  await expect(title).toHaveValue('pending draft title');
  expect(await readLog<UpdateCall>(page, 'resource-workspace-update-calls')).toHaveLength(1);

  await expectNarrowControlsInViewport(page, testInfo, [
    { name: 'pending quick edit drawer', locator: drawer },
    { name: 'pending title field', locator: title },
    { name: 'pending save button', locator: save },
  ]);
  await saveScreenshot(page, testInfo, 'quick-edit-pending-close-protected');

  await page.getByTestId('resolve-deferred-update').click();
  await expect(drawer).toBeHidden();
  await expectRecordTitle(page, 'needle normalized title');
  expect(await readLog<UpdateCall>(page, 'resource-workspace-update-calls')).toHaveLength(1);
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'quick-edit-pending-resolved');
  expect(errors).toEqual([]);
});

test('ResourceWorkspace isolates a replacement quick edit from a resolved old update after the host forces the drawer closed', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=resource-workspace&deferred=hold');

  await expectRecordTitle(page, 'needle item 1');
  const first = await openQuickEdit(page, 1, 'needle item 1');
  await first.title.fill('old pending draft');
  await first.save.click();
  await expect.poll(async () => (await readLog<UpdateCall>(page, 'resource-workspace-update-calls')).length).toBe(1);

  await page.getByTestId('switch-tenant').click();
  await expect(first.drawer).toBeHidden();
  await expect(page.getByTestId('resource-workspace-tenant')).toHaveText('tenant-b');

  await expectRecordTitle(page, 'needle item 2');
  const replacement = await openQuickEdit(page, 2, 'needle item 2');
  await replacement.title.fill('replacement draft');
  await page.getByTestId('resolve-deferred-update').click();
  await expect(replacement.drawer).toBeVisible();
  await expect(replacement.title).toHaveValue('replacement draft');
  await expect(replacement.drawer.getByRole('alert')).toHaveCount(0);
  expect(await readLog<UpdateCall>(page, 'resource-workspace-update-calls')).toHaveLength(1);

  await replacement.drawer.getByRole('button', { name: /^(Close|关闭)$/ }).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: /^(Confirm|确认)$/ }).click();
  await expect(confirm).toBeHidden();
  await expect(replacement.drawer).toBeHidden();
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'quick-edit-replacement-after-old-resolve');
  expect(errors).toEqual([]);
});

test('ResourceWorkspace isolates a replacement quick edit from a rejected old update after the host forces the drawer closed', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=resource-workspace&deferred=hold');

  await expectRecordTitle(page, 'needle item 1');
  const first = await openQuickEdit(page, 1, 'needle item 1');
  await first.title.fill('old rejected draft');
  await first.save.click();
  await expect.poll(async () => (await readLog<UpdateCall>(page, 'resource-workspace-update-calls')).length).toBe(1);

  await page.getByTestId('switch-tenant').click();
  await expect(first.drawer).toBeHidden();

  await expectRecordTitle(page, 'needle item 2');
  const replacement = await openQuickEdit(page, 2, 'needle item 2');
  await replacement.title.fill('replacement survives rejection');
  await page.getByTestId('reject-deferred-update').click();
  await expect(replacement.drawer).toBeVisible();
  await expect(replacement.title).toHaveValue('replacement survives rejection');
  await expect(replacement.drawer.getByRole('alert')).toHaveCount(0);
  expect(await readLog<UpdateCall>(page, 'resource-workspace-update-calls')).toHaveLength(1);
  expect(await page.locator('body').textContent() ?? '').not.toContain('PRIVATE_RESOURCE_UPDATE_DIAGNOSTIC');

  await replacement.drawer.getByRole('button', { name: /^(Close|关闭)$/ }).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: /^(Confirm|确认)$/ }).click();
  await expect(confirm).toBeHidden();
  await expect(replacement.drawer).toBeHidden();
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'quick-edit-replacement-after-old-reject');
  expect(errors).toEqual([]);
});

test('ResourceWorkspace retries a failed first query by keyboard, then preserves search, page and selection through detail', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=resource-workspace&fail=list-once');

  await expect(page.getByRole('alert')).toContainText(/Operation failed|操作失败/);
  await expect.poll(async () => (await readLog<ListCall>(page, 'resource-workspace-list-calls')).length).toBe(1);
  expect((await lastListCall(page))?.failed).toBe(true);
  expect(await page.locator('body').textContent()).not.toContain('PRIVATE_RESOURCE_LIST_DIAGNOSTIC');

  const retry = page.getByRole('button', { name: /^(Retry|重试)$/ }).first();
  await retry.focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => {
    const calls = await readLog<ListCall>(page, 'resource-workspace-list-calls');
    return calls.length >= 2 && calls.at(-1)?.failed === false;
  }).toBe(true);
  await expectRecordTitle(page, 'needle item 1');

  const search = page.getByPlaceholder(/^(Search|搜索)/);
  await search.fill('needle');
  await waitForListQuery(page, 'needle', 1);
  await expectRecordTitle(page, 'needle item 1');
  await openSecondPage(page);

  const selected = page.getByRole('checkbox', { name: selectLabel(11) });
  await selected.check();
  await expect(selected).toBeChecked();

  const row = recordFor(page, 11);
  await row.getByRole('button', { name: /^(Detail|详情)$/ }).click();
  const dialog = page.getByRole('dialog', { name: /Browser records/ });
  await expect(dialog).toBeVisible();
  await waitForAnimations(dialog);
  await expect(dialog).toContainText('needle item 11');
  const detailCalls = await readLog<{ resource: string; id: string | number }>(page, 'resource-workspace-detail-calls');
  expect(detailCalls.at(-1)).toEqual(expect.objectContaining({ resource: 'browser-records', id: 11 }));
  await saveScreenshot(page, testInfo, 'detail-open');

  await dialog.getByRole('button', { name: /^(Close|关闭)$/ }).click();
  await expect(dialog).toBeHidden();

  await expect(search).toHaveValue('needle');
  await expect(page.locator('[data-slot="pagination-link"][aria-current="page"]')).toHaveText('2');
  await expect(selected).toBeChecked();
  expect(await lastListCall(page)).toEqual(expect.objectContaining({
    filters: expectedSearchFilters('needle'),
    pagination: expect.objectContaining({ current: 2, pageSize: 10 }),
  }));
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'detail-closed-query-preserved');
  expect(errors).toEqual([]);
});

test('ResourceWorkspace keeps a quick-edit draft after failure and retries to the normalized server value without losing search, page or selection', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=resource-workspace&fail=update-once');

  await expectRecordTitle(page, 'needle item 1');
  const search = page.getByPlaceholder(/^(Search|搜索)/);
  await search.fill('needle');
  await waitForListQuery(page, 'needle', 1);
  await openSecondPage(page);

  const selected = page.getByRole('checkbox', { name: selectLabel(11) });
  await selected.check();
  const row = recordFor(page, 11);
  await row.getByRole('button', { name: /^(More actions|更多操作)$/ }).click();
  const menu = page.getByRole('menu', { name: /More actions|更多操作/ });
  await expect(menu).toBeVisible();
  await waitForAnimations(menu);
  await menu.getByRole('menuitem', { name: /^(Quick edit|快速编辑)$/ }).click();

  const drawer = page.getByRole('dialog', { name: /Browser records/ });
  await expect(drawer).toBeVisible();
  await waitForAnimations(drawer);
  const title = drawer.getByRole('textbox', { name: /^(Title|标题)$/ });
  await expect(title).toHaveValue('needle item 11');
  await title.fill('needle draft title');
  await expect(title).toHaveValue('needle draft title');
  const save = drawer.getByRole('button', { name: /^(Save|保存)$/ });
  await save.click();
  await expect(drawer.getByRole('alert')).toContainText(/Operation failed|操作失败/);
  await expect(title).toHaveValue('needle draft title');
  await expect(drawer).toBeVisible();
  await expect.poll(async () => (await readLog<UpdateCall>(page, 'resource-workspace-update-calls')).length).toBe(1);
  await waitForListQuery(page, 'needle', 2);
  expect(await page.locator('body').textContent() ?? '').not.toContain('PRIVATE_RESOURCE_UPDATE_DIAGNOSTIC');
  await expect(selected).toBeChecked();

  await waitForAnimations(drawer);
  await expectNarrowControlsInViewport(page, testInfo, [
    { name: 'quick edit drawer', locator: drawer },
    { name: 'title field', locator: title },
    { name: 'save button', locator: save },
  ]);
  await saveScreenshot(page, testInfo, 'quick-edit-save-failed');

  await expect(save).toBeEnabled();
  await save.click();
  await expect(drawer).toBeHidden();
  await expectRecordTitle(page, 'needle normalized title');
  await expect.poll(async () => (await readLog<UpdateCall>(page, 'resource-workspace-update-calls')).length).toBe(2);
  await waitForListQuery(page, 'needle', 2);

  const updates = await readLog<UpdateCall>(page, 'resource-workspace-update-calls');
  expect(updates).toHaveLength(2);
  for (const update of updates) {
    expect(update).toEqual({
      resource: 'browser-records',
      id: 11,
      variables: { title: 'needle draft title' },
      meta: { tenantId: 'tenant-a' },
    });
  }
  await expect(search).toHaveValue('needle');
  await expect(page.locator('[data-slot="pagination-link"][aria-current="page"]')).toHaveText('2');
  await expect(selected).toBeChecked();
  expect(await readLog(page, 'resource-workspace-write-calls')).toEqual([]);
  expect(await page.locator('body').textContent()).not.toContain('PRIVATE_RESOURCE');
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'quick-edit-retried');
  expect(errors).toEqual([]);
});

test('ResourceWorkspace keeps detail and edit fail-closed when list access is allowed but show and edit are denied', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=resource-workspace&deny=show-edit');

  await expectRecordTitle(page, 'needle item 1');
  await expect.poll(async () => {
    const calls = await readLog<{ action: string }>(page, 'resource-workspace-permission-calls');
    return calls.some(call => call.action === 'show') && calls.some(call => call.action === 'edit');
  }).toBe(true);
  await expect(page.getByRole('button', { name: /^(Detail|详情|Edit|编辑)$/ })).toHaveCount(0);

  const row = recordFor(page, 1);
  await row.getByRole('button', { name: /^(More actions|更多操作)$/ }).click();
  const menu = page.getByRole('menu', { name: /More actions|更多操作/ });
  await expect(menu).toBeVisible();
  await waitForAnimations(menu);
  await expect(menu.getByRole('menuitem', { name: /^(Delete|删除)$/ })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /^(Edit|编辑)$/ })).toHaveCount(0);
  await expect(menu.getByRole('menuitem', { name: /^(Quick edit|快速编辑)$/ })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await readLog(page, 'resource-workspace-detail-calls')).toEqual([]);
  expect(await readLog(page, 'resource-workspace-update-calls')).toEqual([]);
  expect(await readLog(page, 'resource-workspace-write-calls')).toEqual([]);
  expect(await page.locator('body').textContent()).not.toContain('PRIVATE_RESOURCE');
  await saveScreenshot(page, testInfo, 'show-edit-denied');
  await page.keyboard.press('Escape');
  await expectNoNarrowOverflow(page, testInfo);
  expect(errors).toEqual([]);
});
