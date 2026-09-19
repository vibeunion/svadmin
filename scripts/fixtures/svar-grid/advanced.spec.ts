import { test, expect, type Page, type Route } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { GetListParams } from '@svadmin/core';

interface Row { id: number; name: string; stock: number; children?: Row[] }
async function backend(page: Page, initial?: Row[]) {
  const state = { rows: initial ?? [{ id: 1, name: 'Alpha', stock: 10 }, { id: 2, name: 'Beta', stock: 20 }, { id: 3, name: 'Gamma', stock: 30 }],
    writes: [] as { method: string; id: number; body: Record<string, unknown> }[], reads: [] as GetListParams[], fail: new Set<number>() };
  await page.route('**/api/rows**', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.searchParams.has('query')) {
      const query = JSON.parse(url.searchParams.get('query') ?? '{}') as GetListParams; state.reads.push(query);
      let rows = [...state.rows];
      for (const filter of query.filters ?? []) {
        if ('field' in filter && filter.field === 'name' && filter.operator === 'contains') rows = rows.filter(row => row.name.includes(String(filter.value)));
      }
      const sort = query.sorters?.[0];
      if (sort?.field === 'name') rows.sort((a, b) => a.name.localeCompare(b.name) * (sort.order === 'asc' ? 1 : -1));
      const total = rows.length, size = query.pagination?.pageSize ?? 25, start = ((query.pagination?.current ?? 1) - 1) * size;
      await route.fulfill({ json: { data: rows.slice(start, start + size), total } }); return;
    }
    const id = Number(url.pathname.split('/').at(-1));
    const body = (request.postDataJSON() ?? {}) as Record<string, unknown>; state.writes.push({ method: request.method(), id, body });
    if (state.fail.has(id)) { await route.fulfill({ status: 500, json: { error: 'Controlled fixture failure' } }); return; }
    const row = state.rows.find(value => value.id === id);
    if (!row) { await route.fulfill({ status: 404, json: {} }); return; }
    if (request.method() === 'PATCH') {
      Object.assign(row, body['variables'] as Partial<Pick<Row, 'name' | 'stock'>>); await route.fulfill({ json: { data: { ...row } } });
    } else if (request.method() === 'DELETE') {
      state.rows = state.rows.filter(value => value.id !== id); await route.fulfill({ json: { data: row } });
    } else await route.fulfill({ json: { data: row } });
  });
  return state;
}
async function open(page: Page, mode: string) {
  await page.goto('/advanced.html'); if (mode !== 'operations') await page.getByRole('button', { name: mode, exact: true }).click();
}
async function scroll(page: Page, pane: 'center' | 'right', top: number, left = 0) {
  await page.locator(`[data-svar-pane="${pane}"]`).evaluate((root, value) => {
    const element = [...root.querySelectorAll<HTMLElement>('*')].find(node => node.scrollHeight > node.clientHeight + 40 && ['auto', 'scroll'].includes(getComputedStyle(node).overflowY));
    if (!element) throw new Error('Grid scroll viewport not found');
    element.scrollTop = value.top; element.scrollLeft = value.left; element.dispatchEvent(new Event('scroll'));
  }, { top, left });
}
async function edit(page: Page, text: string, value: string) {
  // 按用户可见文本定位，不能用未经空白归一化的整个 gridcell textContent 精确正则。
  await page.locator('[data-svadmin-svar-grid]').getByText(text, { exact: true }).dblclick();
  const editor = page.locator('[data-svadmin-svar-grid]').getByRole('textbox').last();
  await editor.fill(value); await editor.press('Enter');
}
async function confirmUpdate(page: Page, value: string) {
  await page.getByRole('button', { name: 'Select page', exact: true }).click();
  await page.getByRole('button', { name: 'Update selected', exact: true }).click();
  await page.getByRole('combobox', { name: 'Update field' }).selectOption('stock');
  await page.getByRole('textbox', { name: 'New value' }).fill(value);
  await page.getByRole('button', { name: 'Confirm action', exact: true }).click();
}

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) console.info('Fixture failure state:', (await page.locator('body').innerText()).slice(0, 6000));
});

test('real inline editing uses the checked core mutation and rejects invalid numeric input', async ({ page }) => {
  const state = await backend(page); await open(page, 'operations');
  await expect(page.getByText('Alpha', { exact: true })).toBeVisible(); await edit(page, 'Alpha', 'Renamed');
  await expect(page.getByText('Renamed', { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1); expect(state.writes[0]?.body['variables']).toEqual({ name: 'Renamed' });
  await edit(page, '20', '-1'); await expect(page.getByRole('alert')).toContainText('Save failed');
  expect(state.writes).toHaveLength(1); expect(state.rows[1]?.stock).toBe(20);
});

test('batch permissions are preflighted before writes and deletes require confirmation', async ({ page }) => {
  const state = await backend(page); await open(page, 'operations'); await expect(page.getByText('Alpha', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Deny second record', exact: true }).click(); await confirmUpdate(page, '7');
  await expect(page.getByRole('alert')).toContainText('Operation incomplete'); expect(state.writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Deny second record', exact: true }).click(); await page.getByRole('button', { name: 'Select page', exact: true }).click();
  await page.getByRole('button', { name: 'Delete selected', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Confirm batch action' })).toBeVisible(); expect(state.writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Confirm action', exact: true }).click(); await expect.poll(() => state.rows.length).toBe(0);
  expect(state.writes.map(write => write.id)).toEqual([1, 2, 3]);
});

test('partial failures are reported without auto-retrying failed writes', async ({ page }) => {
  const state = await backend(page); state.fail.add(2); await open(page, 'operations');
  await expect(page.getByText('Alpha', { exact: true })).toBeVisible(); await confirmUpdate(page, '9');
  await expect(page.getByText('Succeeded / failed / skipped: 2 / 1 / 0', { exact: true })).toBeVisible();
  expect(state.writes.map(write => write.id)).toEqual([1, 2, 3]); expect(state.rows.map(row => row.stock)).toEqual([9, 20, 9]);
});

test('changing scope during a batch prevents subsequent dispatches', async ({ page }) => {
  const state = await backend(page); let held: Route | undefined;
  await page.route('**/api/rows/1', async route => { held = route; state.writes.push({ method: route.request().method(), id: 1, body: route.request().postDataJSON() as Record<string, unknown> }); });
  await open(page, 'operations'); await expect(page.getByText('Alpha', { exact: true })).toBeVisible();
  await confirmUpdate(page, '8'); await expect.poll(() => held !== undefined).toBe(true);
  await page.getByRole('button', { name: 'Scope', exact: true }).click(); await expect(page.getByTestId('advanced-scope')).toHaveText('alpha:1');
  const completed = page.waitForResponse(response => response.url().endsWith('/api/rows/1'));
  await held?.fulfill({ json: { data: { id: 1, name: 'Alpha', stock: 8 } } }); await (await completed).finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))));
  expect(state.writes.map(write => write.id)).toEqual([1]);
});

test('tree CSV checks descendants and exports only the frozen authorized snapshot', async ({ page }) => {
  await backend(page, [{ id: 1, name: 'Parent', stock: 1, children: [{ id: 2, name: '=command', stock: 2 }] }]);
  await open(page, 'tree-operations'); await expect(page.getByText('Parent', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Deny second record', exact: true }).click();
  let downloads = 0; page.on('download', () => { downloads++; });
  await page.getByRole('button', { name: 'Export page CSV' }).click(); await expect(page.getByRole('alert')).toContainText('Export failed'); expect(downloads).toBe(0);
  await page.getByRole('button', { name: 'Deny second record', exact: true }).click();
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export page CSV' }).click();
  const file = await (await pending).path(); if (!file) throw new Error('Missing actual CSV download');
  const csv = await readFile(file, 'utf8'); expect(csv).toContain('Parent'); expect(csv).toContain("'=command"); expect(downloads).toBe(1);
});

test('saved views survive remounts and remain separated by tenant', async ({ page }) => {
  await backend(page); await open(page, 'operations'); await expect(page.getByText('Alpha', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'View name' }).fill('My inventory'); await page.getByRole('button', { name: 'Save view', exact: true }).click();
  await page.reload(); await expect(page.getByRole('combobox', { name: 'Current view' })).toContainText('My inventory');
  await page.getByRole('button', { name: 'Tenant', exact: true }).click(); await expect(page.getByRole('combobox', { name: 'Current view' })).not.toContainText('My inventory');
  await page.getByRole('button', { name: 'Tenant', exact: true }).click(); await expect(page.getByRole('combobox', { name: 'Current view' })).toContainText('My inventory');
});

test('right pane synchronizes actual vertical scrolling, sorting and filtering', async ({ page }) => {
  await backend(page); await open(page, 'pinned'); const right = page.locator('[data-svar-pane="right"]');
  await expect(right.getByText('Pinned 0', { exact: true })).toBeVisible(); const before = await right.boundingBox();
  await scroll(page, 'center', 440, 200); await expect(right.getByText('Pinned 10', { exact: true })).toBeVisible(); expect((await right.boundingBox())?.x).toBe(before?.x);
  await scroll(page, 'center', 0); await page.locator('[data-svar-pane="center"]').getByText('Stock', { exact: true }).click();
  await expect(right.getByText('Pinned 19999', { exact: true })).toBeVisible();
  await page.locator('[data-svar-pane="center"] input').first().fill('Row 00123');
  await expect(right.getByText('Pinned 123', { exact: true })).toBeVisible(); await expect(right.getByText('Pinned 19999', { exact: true })).toHaveCount(0);
});

test('keyboard focus crosses the center and right pane boundary', async ({ page }) => {
  await backend(page); await open(page, 'pinned');
  await page.locator('[data-svar-pane="center"]').getByText('20000', { exact: true }).click();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.evaluate(() => document.activeElement?.closest('[data-svar-pane]')?.getAttribute('data-svar-pane'))).toBe('right');
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => page.evaluate(() => document.activeElement?.closest('[data-svar-pane]')?.getAttribute('data-svar-pane'))).toBe('center');
});

test('lazy loading deduplicates expansion and drops an old scope response', async ({ page }) => {
  await backend(page); let calls = 0; let held: Route | undefined;
  await page.route('**/api/children/**', async route => {
    calls++; if (new URL(route.request().url()).searchParams.get('scope') === '0') { held = route; return; }
    await route.fulfill({ json: [{ id: 'fresh', name: 'Fresh child', stock: 2, note: 'Fresh pinned' }] });
  });
  await open(page, 'lazy'); const toggle = page.locator('.wx-table-tree-toggle').first();
  await toggle.click(); await toggle.click(); await expect.poll(() => calls).toBe(1);
  await page.getByRole('button', { name: 'Scope', exact: true }).click(); await toggle.click();
  await expect(page.getByText('Fresh child', { exact: true })).toBeVisible(); await expect(page.locator('[data-svar-pane="right"]').getByText('Fresh pinned', { exact: true })).toBeVisible();
  await held?.fulfill({ json: [{ id: 'stale', name: 'Obsolete child', stock: 1, note: 'Obsolete pinned' }] }).catch(() => {});
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))));
  await expect(page.getByText('Obsolete child', { exact: true })).toHaveCount(0);
});

test('server windows request bounded exact slices, support retry and reset on scope changes', async ({ page }) => {
  await backend(page); const ranges: { start: number; end: number; scope: string }[] = []; let fail = true;
  await page.route('**/api/window?**', async route => {
    const params = new URL(route.request().url()).searchParams, start = Number(params.get('start')), end = Number(params.get('end')), scope = params.get('scope') ?? '';
    ranges.push({ start, end, scope });
    if (fail) { fail = false; await route.fulfill({ status: 503, json: {} }); return; }
    await route.fulfill({ json: { data: Array.from({ length: end - start }, (_, i) => ({ id: start + i, name: `Remote ${start + i}`, stock: start + i, note: scope })), total: 100000 } });
  });
  await open(page, 'window'); await expect(page.getByRole('alert')).toContainText('Window load failed');
  await page.getByRole('button', { name: 'Retry window' }).click(); await expect(page.getByText('Remote 0', { exact: true })).toBeVisible();
  await scroll(page, 'center', 44000); await expect(page.getByText('Remote 1000', { exact: true })).toBeVisible();
  expect(ranges.every(range => range.end - range.start < 100)).toBe(true); expect(ranges.some(range => range.start > 900)).toBe(true);
  expect(await page.getByRole('gridcell').count()).toBeLessThan(300);
  await page.getByRole('button', { name: 'Scope', exact: true }).click(); await expect(page.getByText('Remote 0', { exact: true })).toBeVisible(); expect(ranges.at(-1)?.scope).toBe('1');
});

test('infinite loading appends without resetting scroll and exposes a keyboard-accessible action', async ({ page }) => {
  await backend(page); const offsets: number[] = [];
  await page.route('**/api/more?**', async route => {
    const offset = Number(new URL(route.request().url()).searchParams.get('offset')); offsets.push(offset);
    await route.fulfill({ json: Array.from({ length: 25 }, (_, i) => ({ id: offset + i, name: `Added ${offset + i}`, stock: 1, note: 'More' })) });
  });
  await open(page, 'infinite'); await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(page.getByTestId('loaded-count')).toHaveText('50'); expect(offsets).toEqual([25]);
  await scroll(page, 'center', 1800); await expect(page.getByTestId('loaded-count')).toHaveText('75'); expect(offsets).toEqual([25, 50]);
  await expect(page.getByText('Added 41', { exact: true })).toBeVisible();
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
  test(`advanced real UI states at ${viewport.width}`, async ({ page }, testInfo) => {
    await backend(page); await page.setViewportSize(viewport); await open(page, 'operations'); await expect(page.getByText('Alpha', { exact: true })).toBeVisible();
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') await page.getByRole('button', { name: 'Theme', exact: true }).click();
      await page.screenshot({ path: testInfo.outputPath(`${theme}-operations-${viewport.width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Select page', exact: true }).click(); await page.getByRole('button', { name: 'Update selected', exact: true }).click();
      await expect(page.getByRole('group', { name: 'Confirm batch action' })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`${theme}-batch-confirm-${viewport.width}.png`), fullPage: true }); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await page.getByRole('button', { name: 'pinned', exact: true }).click(); await expect(page.locator('[data-svar-pane="right"]')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${theme}-right-pane-${viewport.width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'operations', exact: true }).click(); await expect(page.getByText('Alpha', { exact: true })).toBeVisible();
    }
  });
}
