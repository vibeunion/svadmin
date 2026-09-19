import { expect, test, type Page } from '@playwright/test';

async function backend(page: Page) {
  const state = { rows: [{ id: 1, name: 'First', stock: 1 }, { id: 2, name: 'Second', stock: 2 }],
    writes: [] as { method: string; id: number; variables: Record<string, unknown> }[] };
  await page.route('**/api/compat**', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.searchParams.has('query')) {
      await route.fulfill({ json: { data: state.rows, total: state.rows.length } }); return;
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

async function open(page: Page) {
  await page.goto('/auto-table.html#/inventory');
  await expect(page.locator('[data-compat-name]').first()).toHaveText('SKU:First');
}

async function confirmDeletion(page: Page) {
  await page.getByRole('checkbox', { name: 'Select record 1', exact: true }).click();
  await page.getByRole('button', { name: 'Batch Delete (1)', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click();
}

test('AutoTable rejects invalid delete input before Provider dispatch and accepts the explicit object contract', async ({ page }) => {
  const state = await backend(page); await open(page);
  await page.getByRole('button', { name: 'Invalid delete input', exact: true }).click();
  await confirmDeletion(page);
  await expect(page.getByRole('alert')).toHaveText('Operation failed');
  expect(state.writes).toHaveLength(0); expect(state.rows).toHaveLength(2);
  await page.getByRole('button', { name: 'Invalid delete input', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Select record 1', exact: true })).not.toBeChecked();
  await confirmDeletion(page);
  await expect.poll(() => state.writes).toEqual([{ method: 'DELETE', id: 1, variables: {} }]);
  await expect(page.locator('[data-compat-name]').first()).toHaveText('SKU:Second');
});

test('AutoTable default actions retain detail URL navigation and the original quick-edit form', async ({ page }) => {
  const state = await backend(page); await open(page);
  await page.getByRole('button', { name: 'Default actions', exact: true }).click();
  const right = page.locator('[data-svar-pane="right"]');
  await right.getByRole('button', { name: 'Detail', exact: true }).first().click();
  const detail = page.locator('[data-svadmin-record-detail]');
  await expect(detail).toBeVisible();
  await expect(page).toHaveURL(url => new URLSearchParams(url.hash.split('?')[1] ?? '').get('detail') === '~svadmin-id:["number",1]');
  await expect(detail.getByText('First', { exact: true })).toBeVisible();
  await detail.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(detail).toHaveCount(0); await expect(page).not.toHaveURL(/detail=/);
  await right.getByRole('button', { name: 'More actions', exact: true }).first().click();
  await page.getByRole('menuitem', { name: 'Quick edit', exact: true }).click();
  const form = page.locator('[data-svadmin-quick-edit]');
  await expect(form).toBeVisible(); await form.getByLabel('Stock', { exact: true }).fill('7');
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => state.writes).toEqual([{ method: 'PATCH', id: 1, variables: { stock: 7 } }]);
  await expect(form).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit Stock', exact: true }).first()).toHaveText('7');
});

test('AutoTable semantic colors follow a nested host theme at desktop and mobile widths', async ({ page }) => {
  await backend(page); await open(page);
  const heading = page.getByRole('heading', { name: 'Compatible inventory', exact: true });
  for (const width of [1440, 1920, 390]) {
    await page.setViewportSize({ width, height: 900 });
    // ResizeObserver 与虚拟列更新不是同步完成的；在原 5 秒预算内按实际布局滚动。
    if (width === 390) {
      await expect.poll(async () => {
        await page.locator('[data-svar-pane="center"]').evaluate(root => {
          const viewport = [...root.querySelectorAll<HTMLElement>('*')].find(element =>
            element.scrollWidth > element.clientWidth + 20 && ['auto', 'scroll'].includes(getComputedStyle(element).overflowX));
          if (!viewport) return;
          viewport.scrollLeft = viewport.scrollWidth;
          viewport.dispatchEvent(new Event('scroll'));
        });
        // isVisible 只要求布局框存在，旧虚拟列即使已被滚动窗裁切也会返回 true。
        // 在浏览器完成布局后检查真实交集，避免缩小视口时过早结束轮询。
        return page.getByRole('button', { name: 'Edit Stock', exact: true }).first().evaluateAll(async elements => {
          const button = elements[0];
          if (!button) return false;
          return new Promise<boolean>(resolve => {
            const observer = new IntersectionObserver(entries => {
              observer.disconnect();
              const entry = entries[0];
              resolve(entry?.isIntersecting === true && entry.intersectionRatio === 1);
            });
            observer.observe(button);
          });
        });
      }, { timeout: 5_000 }).toBe(true);
    }
    await expect(page.getByRole('button', { name: 'Edit Stock', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit Stock', exact: true }).first()).toBeInViewport();
    for (const dark of [false, true]) {
      if (dark) await page.getByRole('button', { name: 'Theme', exact: true }).click();
      const hostColor = await page.locator('main').evaluate(element => getComputedStyle(element).color);
      await expect(heading).toHaveCSS('color', hostColor);
      await expect(page.getByRole('button', { name: 'Edit Stock', exact: true }).first()).toHaveCSS('color', hostColor);
      await expect(page.getByRole('button', { name: 'Filter', exact: true })).toHaveCSS('color', hostColor);
      const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      expect(sizes.document).toBeLessThanOrEqual(sizes.viewport);
    }
    await page.getByRole('button', { name: 'Theme', exact: true }).click();
  }
});
