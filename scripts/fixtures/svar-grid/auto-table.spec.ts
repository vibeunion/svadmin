import { expect, test, type Page } from '@playwright/test';
import type { GetListParams } from '@svadmin/core';

async function backend(page: Page, empty = false) {
  const state = { rows: empty ? [] : Array.from({ length: 40 }, (_, i) => ({ id: i + 1, name: `Item ${String(i + 1).padStart(2, '0')}`, stock: i + 1 })), reads: [] as GetListParams[], writes: [] as { method: string; id: number; variables: Record<string, unknown> }[] };
  await page.route('**/api/compat**', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.searchParams.has('query')) {
      const query = JSON.parse(url.searchParams.get('query') ?? '{}') as GetListParams; state.reads.push(query);
      let rows = [...state.rows];
      for (const filter of query.filters ?? []) if ('field' in filter && filter.field === 'name' && filter.operator === 'contains') rows = rows.filter(row => row.name.includes(String(filter.value)));
      const sort = query.sorters?.[0];
      if (sort) rows.sort((a, b) => (sort.field === 'stock' || sort.field === 'id' ? a.stock - b.stock : a.name.localeCompare(b.name)) * (sort.order === 'desc' ? -1 : 1));
      const total = rows.length, size = query.pagination?.pageSize ?? 10, start = ((query.pagination?.current ?? 1) - 1) * size;
      await route.fulfill({ json: { data: rows.slice(start, start + size), total } }); return;
    }
    const id = Number(url.pathname.split('/').at(-1)), row = state.rows.find(row => row.id === id);
    if (!row) { await route.fulfill({ status: 404, json: {} }); return; }
    if (request.method() === 'GET') { await route.fulfill({ json: { data: row } }); return; }
    const body = request.postDataJSON() as { variables?: Record<string, unknown> };
    state.writes.push({ method: request.method(), id, variables: body.variables ?? {} });
    if (request.method() === 'PATCH') Object.assign(row, body.variables);
    if (request.method() === 'DELETE') state.rows = state.rows.filter(row => row.id !== id);
    await route.fulfill({ json: { data: { ...row } } });
  });
  return state;
}
async function open(page: Page): Promise<void> { await page.goto('/auto-table.html#/inventory'); }
const names = (page: Page) => page.locator('[data-compat-name]');

test('AutoTable host snippets, row actions, summary and expanded content survive the native grid body', async ({ page }) => {
  await backend(page); await open(page); await expect(names(page).first()).toHaveText('SKU:Item 01');
  await expect(page.getByTestId('compat-summary')).toHaveText('10:40:6');
  await page.getByRole('button', { name: 'Host header', exact: true }).click(); await expect(page.getByTestId('compat-output')).toHaveText('header');
  await page.locator('[data-svar-pane="right"]').getByRole('button', { name: 'Host row 1', exact: true }).click(); await expect(page.getByTestId('compat-output')).toHaveText('row:1');
  await page.getByRole('button', { name: 'Expand', exact: true }).first().click(); await expect(page.locator('[data-compat-expanded]')).toHaveText('Expanded 1');
  await page.getByRole('button', { name: 'Collapse', exact: true }).first().click(); await expect(page.locator('[data-compat-expanded]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Fallback cells', exact: true }).click(); await expect(page.locator('[data-compat-fallback="stock"]').first()).toHaveText('Fallback:1');
});

test('AutoTable server pagination, grid sorting and search continue to synchronize the URL', async ({ page }) => {
  const state = await backend(page); await open(page); await expect(names(page).first()).toHaveText('SKU:Item 01');
  await page.getByRole('button', { name: 'Go to next page', exact: true }).click(); await expect(names(page).first()).toHaveText('SKU:Item 11');
  await expect(page).toHaveURL(/page=2/);
  await page.locator('[data-svar-pane="center"]').getByText('Stock', { exact: true }).click(); await expect(names(page).first()).toHaveText('SKU:Item 01');
  await expect(page).toHaveURL(/sort=stock/); expect(state.reads.at(-1)?.pagination?.current).toBe(1);
  await page.locator('[data-svar-pane="center"]').getByText('Stock', { exact: true }).click(); await expect(names(page).first()).toHaveText('SKU:Item 40');
  await page.getByPlaceholder('Search...', { exact: true }).fill('Item 12'); await expect(names(page)).toHaveText(['SKU:Item 12']);
  await expect(page).toHaveURL(/q=Item/); expect(state.reads.at(-1)?.filters).toContainEqual({ field: 'name', operator: 'contains', value: 'Item 12' });
});

test('AutoTable native checkboxes feed existing batch actions and confirmed core deletion', async ({ page }) => {
  const state = await backend(page); await open(page); await expect(names(page).first()).toHaveText('SKU:Item 01');
  await page.getByRole('checkbox', { name: 'Select record 1', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Select record 2', exact: true }).click();
  await page.getByRole('button', { name: 'Host batch', exact: true }).click(); await expect(page.getByTestId('compat-output')).toHaveText('batch:1,2');
  await page.getByRole('button', { name: 'Batch Delete (2)', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible(); expect(state.writes).toHaveLength(0);
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect.poll(() => state.writes.map(write => write.id)).toEqual([1, 2]);
  await expect(names(page).first()).toHaveText('SKU:Item 03');
});

test('AutoTable original inline editor retains mutation validation and permission denial', async ({ page }) => {
  const state = await backend(page); await open(page); await expect(names(page).first()).toHaveText('SKU:Item 01');
  await page.getByRole('button', { name: 'Edit Stock', exact: true }).first().click();
  const editor = page.getByRole('textbox', { name: 'Stock', exact: true }); await editor.fill('19'); await editor.press('Enter');
  await expect.poll(() => state.writes.length).toBe(1); expect(state.writes[0]).toEqual({ method: 'PATCH', id: 1, variables: { stock: 19 } });
  await expect(page.getByRole('button', { name: 'Edit Stock', exact: true }).first()).toHaveText('19');
  await page.getByRole('button', { name: 'Deny edits', exact: true }).click(); await expect(names(page).first()).toHaveText('SKU:Item 01');
  await expect(page.getByRole('button', { name: 'Edit Stock', exact: true })).toHaveCount(0); expect(state.writes).toHaveLength(1);
});

test('AutoTable saved views and hidden columns persist without a parallel preference store', async ({ page }) => {
  await backend(page); await open(page); await expect(names(page).first()).toHaveText('SKU:Item 01');
  await page.getByRole('button', { name: 'Columns', exact: true }).click(); await page.getByRole('menuitemcheckbox', { name: 'Stock', exact: true }).click(); await page.keyboard.press('Escape');
  await expect(page.locator('[data-svar-pane="center"]').getByText('Stock', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Saved Views', exact: true }).click(); await page.getByRole('textbox', { name: 'View name', exact: true }).fill('Compatible view');
  await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.keyboard.press('Escape');
  await page.reload(); await expect(names(page).first()).toHaveText('SKU:Item 01');
  await expect(page.locator('[data-svar-pane="center"]').getByText('Stock', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Saved Views', exact: true }).click(); await expect(page.locator('#saved-list-view')).toContainText('Compatible view'); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Tenant', exact: true }).click(); await expect(page.getByTestId('compat-tenant')).toHaveText('beta');
  await expect(page.locator('[data-svar-pane="center"]').getByText('Stock', { exact: true })).toBeVisible();
});

test('AutoTable accepts controlled pagination and sorters in the compatibility wrapper', async ({ page }) => {
  const state = await backend(page); await open(page); await expect(names(page).first()).toHaveText('SKU:Item 01');
  await page.getByRole('button', { name: 'Controlled state', exact: true }).click();
  await expect(names(page).first()).toHaveText('SKU:Item 30'); expect(state.reads.at(-1)?.pagination).toMatchObject({ current: 2, pageSize: 10 });
  expect(state.reads.at(-1)?.sorters).toEqual([{ field: 'stock', order: 'desc' }]);
});

test('AutoTable denies list reads and retains the host empty state', async ({ page }) => {
  const state = await backend(page, true); await open(page); await expect(page.locator('[data-compat-empty]').first()).toBeVisible();
  await page.getByRole('button', { name: 'Deny list', exact: true }).click(); await expect(page.getByRole('alert')).toBeVisible();
  const count = state.reads.length;
  await expect(page.getByRole('gridcell')).toHaveCount(0);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))));
  expect(state.reads.length).toBe(count);
});

test('AutoTable compatibility screenshots cover light dark and required viewports', async ({ page }, testInfo) => {
  await backend(page); await open(page); await expect(names(page).first()).toHaveText('SKU:Item 01');
  for (const size of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await page.screenshot({ path: testInfo.outputPath(`auto-table-light-${size.width}x${size.height}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Theme', exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath(`auto-table-dark-${size.width}x${size.height}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Theme', exact: true }).click();
  }
});
