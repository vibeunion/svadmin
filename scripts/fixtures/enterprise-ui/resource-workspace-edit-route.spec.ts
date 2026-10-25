import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshotDirectory = resolve(process.cwd(), 'output/playwright/resource-workspace-edit-route-20261022');
const searchableFields = ['title', 'team'];

type ListCall = {
  filters: unknown[];
  sorters: unknown[];
  pagination: { current?: number; pageSize?: number } | undefined;
  ids: number[];
  total: number;
};

type UpdateCall = {
  resource: string;
  id: string | number;
  variables: Record<string, unknown>;
  meta: Record<string, unknown>;
};

type RouteState = {
  pathname: string;
  params: Record<string, string>;
};

async function readLog<T>(page: Page, testId: string): Promise<T[]> {
  const text = await page.getByTestId(testId).textContent();
  return JSON.parse(text ?? '[]') as T[];
}

async function readRoute(page: Page): Promise<RouteState> {
  const text = await page.getByTestId('resource-workspace-edit-route').textContent();
  return JSON.parse(text ?? '{"pathname":"","params":{}}') as RouteState;
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

async function expectNoOverflow(page: Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function saveScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: resolve(screenshotDirectory, `${testInfo.project.name}-${name}.png`),
    fullPage: true,
  });
}

test('ResourceWorkspace list query and page enter the full edit route, keep the failed draft, then return to the normalized server value with the existing query contract', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=resource-workspace-edit-route&fail=update-once');

  await expect(page.getByTestId('resource-workspace-edit-route-fixture')).toBeVisible();
  await expectRecordTitle(page, 'needle item 1');

  const search = page.getByPlaceholder(/^(Search|搜索)/);
  await search.fill('needle');
  await waitForListQuery(page, 'needle', 1);
  await expectRecordTitle(page, 'needle item 1');

  await page.getByRole('button', { name: 'Go to next page' }).click();
  await waitForListQuery(page, 'needle', 2);
  await expectRecordTitle(page, 'needle item 11');

  const row = recordFor(page, 11);
  await row.getByRole('button', { name: /^(Edit|编辑)$/ }).click();

  const editHeading = page.getByRole('heading', { name: /Edit\s*Browser records/ });
  await expect(editHeading).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const title = page.getByRole('textbox', { name: /^(Title|标题)$/ });
  await expect(title).toHaveValue('needle item 11');

  const detailCalls = await readLog<{ resource: string; id: string | number }>(page, 'resource-workspace-detail-calls');
  expect(detailCalls).toEqual([expect.objectContaining({ resource: 'browser-records', id: 11 })]);

  await expect.poll(async () => (await readRoute(page)).pathname).toBe('/browser-records/edit/11');
  const editRoute = await readRoute(page);
  expect(editRoute.params).toEqual(expect.objectContaining({ q: 'needle', page: '2' }));
  await saveScreenshot(page, testInfo, 'full-edit-loaded');

  await title.fill('needle draft title');
  await expect(title).toHaveValue('needle draft title');
  const save = page.getByRole('button', { name: /^(Save|保存)$/ });
  await save.click();

  await expect(page.getByRole('alert').filter({ hasText: /Operation failed|操作失败/ }).first()).toBeVisible();
  await expect(editHeading).toBeVisible();
  await expect(title).toHaveValue('needle draft title');
  await expect.poll(async () => (await readLog<UpdateCall>(page, 'resource-workspace-update-calls')).length).toBe(1);
  await expect.poll(async () => (await readRoute(page)).pathname).toBe('/browser-records/edit/11');
  expect(await page.locator('body').textContent()).not.toContain('PRIVATE_RESOURCE_UPDATE_DIAGNOSTIC');
  await saveScreenshot(page, testInfo, 'full-edit-save-failed-draft-kept');

  await expect(save).toBeEnabled();
  await save.click();

  await expect(editHeading).toHaveCount(0);
  await expectRecordTitle(page, 'needle normalized title');
  await expect.poll(async () => (await readLog<UpdateCall>(page, 'resource-workspace-update-calls')).length).toBe(2);
  await expect.poll(async () => (await readRoute(page)).pathname).toBe('/browser-records');
  const listRoute = await readRoute(page);
  expect(listRoute.params).toEqual(expect.objectContaining({ q: 'needle', page: '2' }));

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
  expect(await lastListCall(page)).toEqual(expect.objectContaining({
    filters: expectedSearchFilters('needle'),
    pagination: expect.objectContaining({ current: 2, pageSize: 10 }),
  }));
  expect(await readLog(page, 'resource-workspace-write-calls')).toEqual([]);
  expect(await page.locator('body').textContent()).not.toContain('PRIVATE_RESOURCE');
  await expectNoOverflow(page);
  await saveScreenshot(page, testInfo, 'full-edit-returned-to-list-query-restored');
  expect(errors).toEqual([]);
});