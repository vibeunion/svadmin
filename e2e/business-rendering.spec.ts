import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { stableScreenshot } from '../scripts/stable-screenshot.mjs';
import { join } from 'node:path';
import { demoSchemas } from '../example/src/resource-schemas';
import { inMemoryDataProvider } from '../example/src/providers/inMemoryDb';

async function login(page: Page) {
  await page.goto('/#/login');
  await page.locator('#login-identifier').fill('admin@example.com');
  await page.locator('#login-password').fill('demo');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/#\/$/);
}

async function openRecords(page: Page) {
  const toggle = page.locator('[data-domain-record-toggle], [data-operations-record-toggle], [data-user-record-toggle]').first();
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

for (const resource of Object.keys(demoSchemas)) {
  test(`checked business routes: ${resource}`, async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await login(page);
    await page.goto(`/#/${resource}`);
    await expect(page.locator('[data-svadmin-content-page]').first()).toBeVisible();
    await expect(page.locator('[data-svadmin-content-page]').first()).not.toBeEmpty();
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
    if (resource === 'roles') {
      await expect(page.locator('[data-role-workspace]')).toBeVisible();
      await expect(page.locator('[data-role-workspace] table tbody tr').first()).toBeVisible();
    } else if (/^(products|skus|categories|suppliers|warehouses|stock_|cycle_|inventory_|reorder_|purchase_|sales_|users$|permissions$|user_|notifications$|store_|project_|ai_prompt$|invoice_|billing_|security_|referral_)/.test(resource)) {
      await openRecords(page);
      await expect(page.locator(`[data-svadmin-rendering-resource="${resource}"][data-svadmin-rendering-kind="table"]`)).toBeVisible();
      await expect(page.locator('table tbody tr').first()).toBeVisible();
    }
    await page.goto(`/#/${resource}/create`);
    const create = page.locator(`[data-svadmin-rendering-resource="${resource}"][data-svadmin-rendering-kind="form"]`);
    await expect(create).toHaveCount(1);
    await expect(create.locator('form')).toBeVisible();
    const result = await inMemoryDataProvider.getList({ resource, pagination: { current: 1, pageSize: 1 } });
    const first = result.data[0];
    if (first) {
      const id = first['id'];
      if (typeof id !== 'number') throw new TypeError('Demo routes require the checked numeric fixture ID');
      for (const action of ['edit', 'clone', 'show']) {
        await page.goto(`/#/${resource}/${action}/${id}`);
        const kind = action === 'show' ? 'show' : 'form';
        const boundary = page.locator(`[data-svadmin-rendering-resource="${resource}"][data-svadmin-rendering-kind="${kind}"]`);
        // 等待路由退出动画移除旧表单，不用 first() 掩盖重复挂载。
        await expect(boundary).toHaveCount(1);
        await expect(boundary).toBeVisible();
        if (kind === 'form') await expect(boundary.locator('form')).toBeVisible();
        else await expect(boundary.locator('[data-slot="skeleton"]')).toHaveCount(0);
        await expect(boundary.locator('[role="alert"]')).toHaveCount(0);
      }
    }
    expect(errors).toEqual([]);
  });
}

test('native product inline editing remains usable through the rendering boundary', async ({ page }) => {
  await login(page);
  await page.goto('/#/products');
  await openRecords(page);
  const table = page.locator('[data-svadmin-rendering-kind="table"]');
  // 按稳定 ID 定位；修改名称后，升序表格会重新排列行。
  const row = table.getByRole('row').filter({ has: page.getByRole('checkbox', { name: 'Select record 1', exact: true }) });
  await row.getByRole('button', { name: /^Edit Name$/ }).click();
  const input = table.getByRole('textbox', { name: 'Name', exact: true });
  await input.fill('Typed renderer inline update');
  await input.press('Enter');
  await expect(input).toBeHidden();
  await expect(row.getByRole('button', { name: /^Edit Name$/ })).toHaveText('Typed renderer inline update');
  await page.reload();
  await openRecords(page);
  await expect(row.getByRole('button', { name: /^Edit Name$/ })).toHaveText('Typed renderer inline update');
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  test(`migration evidence ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    // 仅证据截图降低动效；交互回归仍使用默认浏览器设置。
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(viewport);
    await login(page);
    await page.goto('/#/products');
    await openRecords(page);
    const boundary = page.locator('[data-svadmin-rendering-resource="products"]');
    await expect(boundary.locator('table tbody tr').first()).toBeVisible();
    const directory = process.env['UI_SCREENSHOT_DIR'] ?? testInfo.outputPath('screenshots');
    await mkdir(directory, { recursive: true });
    // 行已可见不等于页面入场结束；检查实际祖先透明度，不覆盖生产 CSS。
    await expect.poll(() => boundary.first().evaluate(element => {
      let opacity = 1;
      for (let node: Element | null = element; node; node = node.parentElement) {
        opacity *= Number(getComputedStyle(node).opacity);
      }
      return opacity;
    })).toBe(1);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const screenshot = await stableScreenshot(() => page.screenshot({ fullPage: false, animations: 'disabled', caret: 'hide' }));
    await writeFile(join(directory, `typed-rendering-${viewport.width}x${viewport.height}.png`), screenshot);
    await testInfo.attach('typed-rendering-screen', { path: join(directory, `typed-rendering-${viewport.width}x${viewport.height}.png`), contentType: 'image/png' });
  });
}

for (const route of ['', 'design_principles']) {
  test(`native dashboard and static showcase: ${route || 'dashboard'}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await login(page);
    await page.goto(`/#/${route}`);
    await expect(page.locator('[data-svadmin-content-page]').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}


test('product quick-edit and detail drawers keep the checked contract and persist updates', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page);
  await page.goto('/#/products');
  await openRecords(page);
  const table = page.locator('[data-svadmin-rendering-kind="table"]');
  const row = table.getByRole('row').filter({ has: page.getByRole('checkbox', { name: 'Select record 1', exact: true }) });
  await row.getByRole('button', { name: 'More actions', exact: true }).click();
  await page.getByRole('menuitem', { name: /^Quick edit$/i }).click();
  const drawer = page.locator('[data-svadmin-quick-edit]');
  await expect(drawer.locator('[data-svadmin-rendering-resource="products"][data-svadmin-rendering-kind="form"]')).toBeVisible();
  await drawer.getByRole('textbox', { name: /^Name/ }).fill('Contract checked drawer update');
  await drawer.getByRole('button', { name: /Save/, exact: false }).click();
  await expect(drawer).toBeHidden();
  await expect(row).toContainText('Contract checked drawer update');
  await row.getByRole('button', { name: 'Detail', exact: true }).click();
  const detail = page.locator('[data-svadmin-rendering-kind="detail-drawer"]');
  await expect(detail).toHaveAttribute('data-svadmin-rendering-resource', 'products');
  await expect(detail).toContainText('Contract checked drawer update');
  await expect(detail.locator('[role="alert"]')).toHaveCount(0);
  await page.reload();
  await openRecords(page);
  await expect(row).toContainText('Contract checked drawer update');
  expect(errors).toEqual([]);
});
