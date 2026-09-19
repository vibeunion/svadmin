import { test, expect, type Page, type Route } from '@playwright/test';
import type { GetListParams } from '@svadmin/core';

async function resourceBackend(page: Page) {
  const requests: GetListParams[] = [];
  await page.route('**/api/rows?**', async route => {
    const encoded = new URL(route.request().url()).searchParams.get('query');
    if (!encoded) throw new Error('Missing provider query');
    const query = JSON.parse(encoded) as GetListParams;
    requests.push(query);
    const scope = JSON.stringify(query.meta ?? {}).includes('beta') ? 'Beta' : 'Alpha';
    const filtered = (query.filters?.length ?? 0) > 0;
    const start = ((query.pagination?.current ?? 1) - 1) * (query.pagination?.pageSize ?? 25);
    const total = filtered ? 1 : 60;
    const data = Array.from({ length: filtered ? 1 : 25 }, (_, index) => ({
      id: start + index, name: `${scope} ${filtered ? 'Match' : `Product ${start + index}`}`, stock: index,
    }));
    await route.fulfill({ json: { data, total } });
  });
  return requests;
}

test('real SVAR virtualizes 20,000 rows, sorts/filters locally and escapes cell text', async ({ page }) => {
  const external: string[] = [];
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4175')) external.push(request.url()); });
  await page.goto('/');
  await expect(page.getByRole('gridcell').filter({ hasText: 'Product 00000' })).toBeVisible();
  expect(await page.getByRole('gridcell').count()).toBeLessThan(300);
  await expect(page.locator('[data-svadmin-svar-grid] img')).toHaveCount(0);
  await page.getByText('Stock', { exact: true }).click();
  await expect(page.getByText('Product 19999', { exact: true })).toBeVisible();
  await page.locator('[data-svadmin-svar-grid] input').first().fill('Product 00123');
  await expect(page.getByText('Product 00123', { exact: true })).toBeVisible();
  await expect(page.getByText('Product 19999', { exact: true })).toHaveCount(0);
  expect(external).toEqual([]);
});

test('tree expansion and left-frozen columns use the real engine', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  await expect(page.getByText('Parent', { exact: true })).toBeVisible();
  await expect(page.getByText('Child', { exact: true })).toHaveCount(0);
  await page.locator('.wx-table-tree-toggle').first().click();
  await expect(page.getByText('Child', { exact: true })).toBeVisible();
  expect(await page.locator('.wx-cell.wx-fixed').count()).toBeGreaterThan(0);
  const count = await page.getByRole('gridcell').count();
  await page.getByText('Child', { exact: true }).dblclick();
  await page.keyboard.press('Delete');
  expect(await page.getByRole('gridcell').count()).toBe(count);
  await page.getByRole('button', { name: 'Scope', exact: true }).click();
  await expect(page.getByText('Child', { exact: true })).toHaveCount(0);
});

test('resource adapter uses core queries for paging, sorting and filtering', async ({ page }) => {
  const requests = await resourceBackend(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Resource', exact: true }).click();
  await expect(page.getByText('Alpha Product 0', { exact: true })).toBeVisible();
  await expect.poll(() => requests.length).toBe(1);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Alpha Product 25', { exact: true })).toBeVisible();
  expect(requests.at(-1)?.pagination?.current).toBe(2);
  await page.getByText('Name', { exact: true }).click();
  await expect.poll(() => requests.at(-1)?.sorters).toEqual([{ field: 'name', order: 'asc' }]);
  expect(requests.at(-1)?.pagination?.current).toBe(1);
  await page.locator('[data-svadmin-svar-grid] input').first().fill('Match');
  await expect(page.getByText('Alpha Match', { exact: true })).toBeVisible();
  expect(requests.at(-1)?.filters).toEqual([{ field: 'name', operator: 'contains', value: 'Match' }]);
  expect(requests.at(-1)?.pagination?.current).toBe(1);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect.poll(() => requests.length).toBe(5);
});

test('permission revocation clears records without another data read; tenant resets query UI', async ({ page }) => {
  const requests = await resourceBackend(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Resource', exact: true }).click();
  await expect(page.getByText('Alpha Product 0', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Access', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Read access denied');
  await expect(page.getByRole('grid')).toHaveCount(0);
  expect(requests).toHaveLength(1);
  await page.getByRole('button', { name: 'Access', exact: true }).click();
  await expect(page.getByText('Alpha Product 0', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Alpha Product 25', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tenant', exact: true }).click();
  await expect(page.getByText('Beta Product 0', { exact: true })).toBeVisible();
  await expect(page.getByText('Alpha Product 25', { exact: true })).toHaveCount(0);
  expect(requests.at(-1)?.pagination?.current).toBe(1);
  const before = requests.length;
  await page.getByRole('button', { name: 'Scope', exact: true }).click();
  await expect.poll(() => requests.length).toBe(before + 1);
  expect(requests.at(-1)?.meta?.['svadminSvarScope']).toBe(1);
  await page.getByRole('button', { name: 'Scope deny', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Read access denied');
  await expect(page.getByRole('grid')).toHaveCount(0);
  expect(requests.length).toBe(before + 1);
});

test('a delayed old-tenant response cannot enter the new grid', async ({ page }) => {
  let oldRoute: Route | undefined;
  await page.route('**/api/rows?**', async route => {
    if (decodeURIComponent(route.request().url()).includes('alpha')) { oldRoute = route; return; }
    await route.fulfill({ json: { data: [{ id: 2, name: 'Beta current', stock: 1 }], total: 1 } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Resource', exact: true }).click();
  await expect.poll(() => oldRoute !== undefined).toBe(true);
  await page.getByRole('button', { name: 'Tenant', exact: true }).click();
  await expect(page.getByText('Beta current', { exact: true })).toBeVisible();
  const retiredResponse = page.waitForResponse(response => decodeURIComponent(response.url()).includes('alpha') && response.url().includes('/api/rows'));
  await oldRoute?.fulfill({ json: { data: [{ id: 1, name: 'Alpha obsolete', stock: 1 }], total: 1 } });
  await (await retiredResponse).finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))));
  await expect(page.getByText('Beta current', { exact: true })).toBeVisible();
  await expect(page.getByText('Alpha obsolete', { exact: true })).toHaveCount(0);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
  test(`light/dark state evidence at ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByText('Product 00000', { exact: true })).toBeVisible();
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') await page.getByRole('button', { name: 'Theme', exact: true }).click();
      for (const state of ['Restore', 'Loading', 'Empty', 'Error', 'Disabled']) {
        await page.getByRole('button', { name: state, exact: true }).click();
        const grid = page.locator('[data-svadmin-svar-grid]');
        if (state === 'Restore') await expect(page.getByText('Product 00000', { exact: true })).toBeVisible();
        if (state === 'Loading') await expect(grid.getByRole('status')).toHaveText('Loading');
        if (state === 'Empty') await expect(grid.getByRole('status')).toHaveText('No records');
        if (state === 'Error') await expect(grid.getByRole('alert')).toHaveText('Fixture data error');
        if (state === 'Disabled') await expect(grid).toHaveAttribute('aria-disabled', 'true');
        await page.screenshot({ path: testInfo.outputPath(`${theme}-${state.toLowerCase()}-${viewport.width}.png`), fullPage: true });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
    }
  });
}
