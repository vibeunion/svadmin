import { expect, test, type Page, type Route } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { GetListParams } from '@svadmin/core';

interface Row { id: number; name: string; stock: number; parentId?: number | null; hasChildren?: boolean }
async function server(page: Page, data?: Row[]) {
  const requests: GetListParams[] = [];
  const rows: Row[] = data ?? Array.from({ length: 2000 }, (_, id) => ({ id, name: `Resource ${id}`, stock: id }));
  await page.route('**/api/rows?query=**', async route => {
    const query = JSON.parse(new URL(route.request().url()).searchParams.get('query') ?? '{}') as GetListParams;
    requests.push(query);
    let filtered = [...rows];
    for (const filter of query.filters ?? []) if ('field' in filter && filter.field === 'parentId' && filter.operator === 'eq') {
      filtered = filtered.filter(row => row.parentId === filter.value);
    }
    const size = query.pagination?.pageSize ?? 25, start = ((query.pagination?.current ?? 1) - 1) * size;
    await route.fulfill({ json: { data: filtered.slice(start, start + size), total: filtered.length } });
  });
  return requests;
}
async function open(page: Page, mode: string): Promise<void> {
  await page.goto('/advanced.html'); await page.getByRole('button', { name: mode, exact: true }).click();
}
async function scroll(page: Page, top: number): Promise<void> {
  await page.locator('[data-svar-pane="center"]').evaluate((root, value) => {
    const viewport = [...root.querySelectorAll<HTMLElement>('*')].find(element => element.scrollHeight > element.clientHeight + 40 && ['auto', 'scroll'].includes(getComputedStyle(element).overflowY));
    if (!viewport) throw new Error('Missing scroll viewport');
    viewport.scrollTop = value; viewport.dispatchEvent(new Event('scroll'));
  }, top);
}

async function expectSilent(page: Page): Promise<void> {
  await expect(page.getByTestId('notification-count')).toHaveText('0');
  await expect(page.getByTestId('queued-toast-count')).toHaveText('0');
  await expect(page.locator('body')).not.toContainText('Fixture request failed');
}

test('a failed primary resource query owns one inline error and recovers through refresh', async ({ page }) => {
  await server(page); let fail = true; let attempts = 0;
  await page.route('**/api/rows?query=**', async route => {
    attempts++;
    if (fail) { await route.fulfill({ status: 503, json: {} }); return; }
    await route.fallback();
  });
  await page.goto('/advanced.html');
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByRole('alert')).toContainText('Data request failed');
  await expectSilent(page);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect.poll(() => attempts).toBe(2);
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  await expectSilent(page);

  fail = false;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByText('Resource 0', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(attempts).toBe(3);
  await expectSilent(page);
});

test('resource windows reuse core pagination and expose the synchronized right pane', async ({ page }) => {
  const requests = await server(page); await open(page, 'resource-window');
  await expect(page.getByText('Resource 0', { exact: true })).toBeVisible();
  await scroll(page, 44000);
  await expect(page.getByText('Resource 1000', { exact: true })).toBeVisible();
  await expect(page.locator('[data-svar-pane="right"]').getByText('1000', { exact: true })).toBeVisible();
  expect(requests.some(request => (request.pagination?.current ?? 0) >= 40)).toBe(true);
  expect(requests.every(request => request.pagination?.pageSize === 25)).toBe(true);
  expect(await page.getByRole('gridcell').count()).toBeLessThan(300);
});

test('resource windows keep a failed window local and silent, then retry the same range', async ({ page }) => {
  const requests = await server(page); let failWindow = true;
  const failures: GetListParams[] = [];
  await page.route('**/api/rows?query=**', async route => {
    const query = JSON.parse(new URL(route.request().url()).searchParams.get('query') ?? '{}') as GetListParams;
    if (failWindow && (query.pagination?.current ?? 1) > 1) {
      failures.push(query); await route.fulfill({ status: 503, json: {} }); return;
    }
    await route.fallback();
  });
  await open(page, 'resource-window'); await expect(page.getByText('Resource 0', { exact: true })).toBeVisible();
  await scroll(page, 44000); await expect(page.getByRole('alert')).toContainText('Window load failed');
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expectSilent(page);
  await page.getByRole('button', { name: 'Retry window', exact: true }).click();
  await expect.poll(() => failures.length).toBe(2);
  await expect(page.getByRole('alert')).toContainText('Window load failed');
  expect(failures[1]).toEqual(failures[0]);
  await expectSilent(page);
  failWindow = false;
  const before = requests.length;
  await page.getByRole('button', { name: 'Retry window', exact: true }).click();
  await expect(page.getByText('Resource 1000', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expectSilent(page);
  expect(requests.slice(before)).toContainEqual(failures[0]);
  expect(requests.slice(before).every(request => (request.pagination?.current ?? 0) > 1)).toBe(true);
});

test('infinite resource selection and CSV include the appended records, not only page one', async ({ page }) => {
  await server(page); await open(page, 'resource-infinite');
  await expect(page.getByText('Resource 0', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(page.getByText('Loaded / total: 50 / 2000', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Select loaded', exact: true }).click();
  await expect(page.getByText('Selected: 50', { exact: true })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export loaded CSV', exact: true }).click();
  const path = await (await pending).path(); if (!path) throw new Error('Missing CSV download');
  const csv = await readFile(path, 'utf8'); expect(csv).toContain('Resource 49'); expect(csv).not.toContain('Resource 50');
});

test('infinite resource append failures stay inline and retry without a notification', async ({ page }) => {
  const requests = await server(page); let failAppend = true; let failures = 0;
  await page.route('**/api/rows?query=**', async route => {
    const query = JSON.parse(new URL(route.request().url()).searchParams.get('query') ?? '{}') as GetListParams;
    if (failAppend && (query.pagination?.current ?? 1) > 1) {
      failures++; await route.fulfill({ status: 503, json: {} }); return;
    }
    await route.fallback();
  });
  await open(page, 'resource-infinite'); await expect(page.getByText('Resource 0', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Loading more rows failed; retry');
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByText('Resource 0', { exact: true })).toBeVisible();
  await expect(page.getByText('Loaded / total: 25 / 2000', { exact: true })).toBeVisible();
  await expectSilent(page);
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect.poll(() => failures).toBe(2);
  await expect(page.getByRole('alert')).toContainText('Loading more rows failed; retry');
  await expectSilent(page);
  failAppend = false;
  const before = requests.length;
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(page.getByText('Loaded / total: 50 / 2000', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expectSilent(page);
  expect(requests.slice(before).map(request => request.pagination?.current)).toEqual([2]);
});

test('lazy resource branches use parent filters and descendant export permission checks', async ({ page }) => {
  const requests = await server(page, [
    { id: 1, name: 'Parent', stock: 1, parentId: null, hasChildren: true },
    { id: 2, name: 'Child', stock: 2, parentId: 1, hasChildren: false },
  ]);
  await open(page, 'resource-lazy'); await expect(page.getByText('Parent', { exact: true })).toBeVisible();
  await expect(page.getByText('Child', { exact: true })).toHaveCount(0);
  await page.locator('.wx-table-tree-toggle').first().click(); await expect(page.getByText('Child', { exact: true })).toBeVisible();
  expect(requests.some(request => request.filters?.some(filter => 'field' in filter && filter.field === 'parentId' && filter.value === 1))).toBe(true);
  await page.getByRole('button', { name: 'Select loaded', exact: true }).click(); await expect(page.getByText('Selected: 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Deny second record', exact: true }).click();
  let downloads = 0; page.on('download', () => { downloads++; });
  await page.getByRole('button', { name: 'Export loaded CSV', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Export failed'); expect(downloads).toBe(0);
});

test('lazy resource child failures stay on the branch and retry without a notification', async ({ page }) => {
  const requests = await server(page, [
    { id: 1, name: 'Parent', stock: 1, parentId: null, hasChildren: true },
    { id: 2, name: 'Child', stock: 2, parentId: 1, hasChildren: false },
  ]);
  let failChild = true; let failures = 0;
  await page.route('**/api/rows?query=**', async route => {
    const query = JSON.parse(new URL(route.request().url()).searchParams.get('query') ?? '{}') as GetListParams;
    const child = query.filters?.some(filter => 'field' in filter && filter.field === 'parentId' && filter.value === 1);
    if (failChild && child) {
      failures++; await route.fulfill({ status: 503, json: {} }); return;
    }
    await route.fallback();
  });
  await open(page, 'resource-lazy'); await expect(page.getByText('Parent', { exact: true })).toBeVisible();
  await page.locator('.wx-table-tree-toggle').first().click();
  await expect(page.getByRole('alert')).toContainText('Child loading failed');
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByText('Parent', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Select loaded', exact: true }).click();
  await expect(page.getByText('Selected: 1', { exact: true })).toBeVisible();
  await expectSilent(page);
  await page.getByRole('button', { name: 'Retry children', exact: true }).click();
  await expect.poll(() => failures).toBe(2);
  await expect(page.getByRole('alert')).toContainText('Child loading failed');
  await expectSilent(page);
  failChild = false;
  const before = requests.length;
  await page.getByRole('button', { name: 'Retry children', exact: true }).click();
  await expect(page.getByText('Child', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expectSilent(page);
  expect(requests.slice(before)).toHaveLength(1);
  expect(requests[before]?.filters).toContainEqual({ field: 'parentId', operator: 'eq', value: 1 });
});

test('permission revocation unmounts resource windows without further Provider reads', async ({ page }) => {
  const requests = await server(page); await open(page, 'resource-window'); await expect(page.getByText('Resource 0', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Deny list', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('You do not have permission to perform this action');
  const count = requests.length;
  await expect(page.getByRole('gridcell')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeDisabled();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))));
  expect(requests.length).toBe(count);
});

test('a held old-scope resource window cannot populate the new scope', async ({ page }) => {
  await server(page); let held: Route | undefined;
  await page.route('**/api/rows?query=**', async route => {
    const query = JSON.parse(new URL(route.request().url()).searchParams.get('query') ?? '{}') as GetListParams;
    if (query.meta?.['svadminSvarScope'] === 0 && (query.pagination?.current ?? 0) > 30) { held = route; return; }
    await route.fallback();
  });
  await open(page, 'resource-window'); await expect(page.getByText('Resource 0', { exact: true })).toBeVisible();
  await scroll(page, 44000); await expect.poll(() => held !== undefined).toBe(true);
  await page.getByRole('button', { name: 'Scope', exact: true }).click();
  await expect(page.getByText('Resource 0', { exact: true })).toBeVisible();
  await held?.fulfill({ json: { data: Array.from({ length: 25 }, (_, id) => ({ id: 9000 + id, name: 'Obsolete', stock: 0 })), total: 2000 } }).catch(() => {});
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))));
  await expect(page.getByText('Obsolete', { exact: true })).toHaveCount(0);
});

test('capture the resource-level window integration at required viewports', async ({ page }, testInfo) => {
  await server(page); await open(page, 'resource-window'); await expect(page.getByText('Resource 0', { exact: true })).toBeVisible();
  for (const size of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await page.screenshot({ path: testInfo.outputPath(`resource-window-${size.width}x${size.height}.png`), fullPage: true });
  }
});
