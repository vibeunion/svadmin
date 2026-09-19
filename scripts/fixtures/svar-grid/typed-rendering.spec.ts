import { expect, test, type Page } from '@playwright/test';

async function backend(page: Page) {
  const state = { reads: 0, writes: 0, invalid: false };
  await page.route('**/api/compat**', async route => {
    const request = route.request();
    if (request.method() !== 'GET') {
      state.writes += 1;
      await route.fulfill({ status: 400, json: {} });
      return;
    }
    state.reads += 1;
    const record = { id: 1, name: 'Typed item', stock: state.invalid ? 'invalid-number' : 7 };
    const list = new URL(request.url()).searchParams.has('query');
    await route.fulfill({ json: list ? { data: [record], total: 1 } : { data: record } });
  });
  return state;
}

const cell = (page: Page) => page.locator('[data-compat-name]').first();
const table = (page: Page) => page.locator('[data-svadmin-rendering-kind="table"]');

test('SVAR AutoTable passes the same rendering contract through native cells, details and quick-edit', async ({ page }) => {
  await backend(page);
  await page.goto('/auto-table.html#/inventory');
  await expect(cell(page)).toHaveText('SKU:Typed item');
  await expect(table(page)).toHaveAttribute('data-svadmin-rendering-resource', 'inventory');
  await expect(table(page).locator('[data-svadmin-svar-grid]')).toBeVisible();
  await page.getByRole('button', { name: 'Default actions', exact: true }).click();
  const right = page.locator('[data-svar-pane="right"]');
  await right.getByRole('button', { name: 'Detail', exact: true }).click();
  const detail = page.locator('[data-svadmin-record-detail]');
  await expect(detail).toHaveAttribute('data-svadmin-rendering-resource', 'inventory');
  await expect(detail).toHaveAttribute('data-svadmin-rendering-kind', 'detail-drawer');
  await detail.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(detail).toHaveCount(0);
  await right.getByRole('button', { name: 'More actions', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Quick edit', exact: true }).click();
  await expect(page.locator('[data-svadmin-quick-edit] [data-svadmin-rendering-resource="inventory"]')).toBeVisible();
});

test('a same-name different contract is rejected before any Provider request and can recover', async ({ page }) => {
  const state = await backend(page);
  await page.goto('/auto-table.html?mismatch=1#/inventory');
  await expect(page.getByRole('alert')).toHaveText('Renderer resource contract mismatch');
  await expect(page.getByRole('gridcell')).toHaveCount(0);
  expect(state.reads).toBe(0); expect(state.writes).toBe(0);
  await page.getByRole('button', { name: 'Recover rendering', exact: true }).click();
  await expect(cell(page)).toHaveText('SKU:Typed item');
  expect(state.reads).toBeGreaterThan(0);
});

test('changing an active rendering contract clears the old Grid without another read or write', async ({ page }) => {
  const state = await backend(page);
  await page.goto('/auto-table.html#/inventory');
  await expect(cell(page)).toHaveText('SKU:Typed item');
  const reads = state.reads;
  await page.getByRole('button', { name: 'Mismatched rendering', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Renderer resource contract mismatch');
  await expect(page.getByRole('gridcell')).toHaveCount(0);
  await expect(page.locator('[data-compat-name]')).toHaveCount(0);
  expect(state.reads).toBe(reads); expect(state.writes).toBe(0);
});

test('invalid Provider records do not reach typed cell snippets and retry restores the grid', async ({ page }) => {
  const state = await backend(page); state.invalid = true;
  await page.goto('/auto-table.html#/inventory');
  await expect(page.getByText('Operation failed', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('gridcell')).toHaveCount(0);
  await expect(page.locator('[data-compat-name]')).toHaveCount(0);
  expect(state.writes).toBe(0);
  state.invalid = false;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(cell(page)).toHaveText('SKU:Typed item');
  await expect(table(page)).toHaveAttribute('data-svadmin-rendering-resource', 'inventory');
});
