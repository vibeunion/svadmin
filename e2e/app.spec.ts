import { test, expect } from '@playwright/test';

/**
 * Login helper — uses structural selectors that don't depend on i18n text.
 */
async function login(page: import('@playwright/test').Page) {
  await page.goto('/#/login');
  // Wait for the login form to render (identifier input is the first text input)
  const identifierInput = page.locator('#login-identifier');
  await identifierInput.waitFor({ state: 'visible', timeout: 15000 });
  await identifierInput.fill('admin@example.com');
  await page.locator('#login-password').fill('demo');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/#\/$/, { timeout: 10000 });
}

async function openRecords(page: import('@playwright/test').Page) {
  const toggle = page.locator('[data-domain-record-toggle], [data-operations-record-toggle], [data-user-record-toggle]').first();
  await toggle.waitFor({ state: 'visible', timeout: 15000 });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

test.describe('Auth Flow', () => {
  test('shows login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    // Login form renders with the identifier input
    await expect(page.locator('#login-identifier')).toBeVisible({ timeout: 15000 });
  });

  test('login with valid credentials', async ({ page }) => {
    await login(page);
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/#/login');
    const identifierInput = page.locator('#login-identifier');
    await identifierInput.waitFor({ state: 'visible', timeout: 15000 });
    await identifierInput.fill('admin@example.com');
    await page.locator('#login-password').fill('wrong');
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('list page loads data', async ({ page }) => {
    const stateProxyEqualityWarnings: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('state_proxy_equality_mismatch')) {
        stateProxyEqualityWarnings.push(message.text());
      }
    });

    await page.goto('/#/products');
    await openRecords(page);
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });

    const firstRow = table.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();

    await expect.poll(() => {
      const [, query = ''] = new URL(page.url()).hash.split('?');
      const params = new URLSearchParams(query);
      return { sort: params.get('sort'), order: params.get('order') };
    }).toEqual({ sort: 'name', order: 'asc' });

    const idSortableHeader = table.getByRole('button', { name: /^ID/ });
    await idSortableHeader.click();
    await expect.poll(() => {
      const [, query = ''] = new URL(page.url()).hash.split('?');
      const params = new URLSearchParams(query);
      return { sort: params.get('sort'), order: params.get('order') };
    }).toEqual({ sort: 'id', order: 'desc' });

    const firstRowCheckbox = firstRow.getByRole('checkbox');
    await firstRowCheckbox.click();
    await expect(firstRowCheckbox).toHaveAttribute('aria-checked', 'true');

    expect(stateProxyEqualityWarnings).toEqual([]);
  });

  test('navigate to create page', async ({ page }) => {
    await page.goto('/#/products');
    await openRecords(page);
    const createBtn = page.getByRole('button', { name: /new product|create/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();
    await expect(page).toHaveURL(/create/, { timeout: 5000 });
  });

  test('navigate to edit page', async ({ page }) => {
    await page.goto('/#/products');
    await openRecords(page);
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });
    const editBtn = page.getByRole('button', { name: /edit/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();
    await expect(page).toHaveURL(/edit/, { timeout: 5000 });
  });

  test('tooltip layers stay bounded across repeated list-to-edit navigation', async ({ page }) => {
    for (let iteration = 0; iteration < 5; iteration += 1) {
      await page.goto('/#/products');
      await openRecords(page);
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

      const editBtn = page.getByRole('button', { name: /edit/i }).first();
      await editBtn.hover();
      await expect(page.getByRole('tooltip')).toBeVisible();
      await editBtn.click();
      await expect(page).toHaveURL(/edit/, { timeout: 5000 });
      await page.waitForTimeout(20);

      const layerStats = await page.evaluate(() => {
        type Layer = { opts?: { ref?: { current?: HTMLElement | null } } };
        const registry = (
          globalThis as typeof globalThis & { bitsDismissableLayers?: Map<Layer, unknown> }
        ).bitsDismissableLayers;
        const layers = [...(registry?.keys() ?? [])];
        return {
          total: layers.length,
          disconnectedTooltips: layers.filter((layer) => {
            const node = layer.opts?.ref?.current;
            return node?.dataset.slot === 'tooltip-content' && !node.isConnected;
          }).length,
        };
      });

      expect(layerStats).toEqual({ total: 0, disconnectedTooltips: 0 });
    }
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('sidebar navigation works', async ({ page }) => {
    const sidebar = page.getByRole('complementary', { name: 'Sidebar navigation' });
    await sidebar.getByRole('button', { name: 'Apps', exact: true }).click();
    await sidebar.getByRole('button', { name: 'Inventory', exact: true }).click();
    await sidebar.getByRole('button', { name: 'Catalog', exact: true }).click();

    const productsLink = sidebar.getByRole('link', { name: 'Products', exact: true });
    await expect(productsLink).toBeVisible({ timeout: 5000 });
    await productsLink.click();
    await expect(page).toHaveURL(/#\/products(?:\?|$)/, { timeout: 5000 });
  });

  test('browser back button works', async ({ page }) => {
    await page.goto('/#/products');
    await page.waitForLoadState('networkidle');
    await page.goto('/#/users');
    await page.waitForLoadState('networkidle');
    await page.goBack();
    await expect(page).toHaveURL(/products/, { timeout: 5000 });
  });
});
