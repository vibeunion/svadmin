import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { chromium, expect as browserExpect, type Browser, type BrowserContext, type Page } from '@playwright/test';

const baseURL = process.env['LITE_TEST_URL'] ?? 'http://127.0.0.1:5182';
let browser: Browser;
let context: BrowserContext;
let page: Page;
const pageErrors: string[] = [];

beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
});

test('scaffold mounts login/dashboard and recovers from auth storage failures', async () => {
  const templateContext = await browser.newContext();
  try {
    const templatePage = await templateContext.newPage();
    const errors: string[] = [];
    templatePage.on('pageerror', error => errors.push(error.message));
    await templatePage.route('https://jsonplaceholder.typicode.com/**', route =>
      route.fulfill({ json: [], headers: { 'x-total-count': '0', 'access-control-expose-headers': 'x-total-count' } }));
    await templatePage.addInitScript(() => {
      const original = Storage.prototype.setItem;
      let fail = true;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'svadmin_demo_auth' && fail) {
          fail = false;
          throw new Error('Controlled storage failure');
        }
        return original.call(this, key, value);
      };
    });
    await templatePage.goto(process.env['TEMPLATE_TEST_URL'] ?? 'http://127.0.0.1:5184');
    await templatePage.getByLabel('Email', { exact: true }).fill('pm@example.test');
    await templatePage.getByLabel('Password', { exact: true }).fill('demo');
    await templatePage.getByRole('button', { name: 'Sign in', exact: true }).click();
    await browserExpect(templatePage.getByRole('alert')).toBeVisible();
    await browserExpect(templatePage.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
    await templatePage.getByRole('button', { name: 'Sign in', exact: true }).click();
    await browserExpect(templatePage.getByRole('heading', { name: 'Recent Posts', exact: true })).toBeVisible();
    await browserExpect(templatePage.getByRole('link', { name: 'View users', exact: true })).toBeVisible();
    expect(await templatePage.locator('a[href="#/users/create"]').count()).toBe(0);
    expect(errors).toEqual([]);
  } finally {
    await templateContext.close();
  }
}, 30_000);
afterAll(async () => {
  await context?.close();
  await browser?.close();
});

describe('Lite native SSR PM regressions', () => {
  test('dashboard loads without hydration and keeps the orders table inside mobile width', async () => {
    for (const width of [375, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto('/lite');
      expect(response?.status()).toBe(200);
      expect(await page.locator('script').count()).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(await page.getByRole('region', { name: 'Recent sales orders' }).count()).toBe(1);
    }
    expect(await page.getByText(/Revenue from \d+ latest orders/).count()).toBe(1);
    expect(await page.getByText('Total Revenue', { exact: true }).count()).toBe(0);
    expect(await page.getByText('SSR Rendering Latency', { exact: true }).count()).toBe(0);
    expect(pageErrors).toEqual([]);
  });

  test('create validation displays an error and retains submitted non-sensitive values', async () => {
    await page.goto('/lite/posts/create');
    await page.locator('[name="status"]').selectOption('published');
    await page.locator('form[action="?/create"]').evaluate(form => {
      (form as HTMLFormElement).noValidate = true;
    });
    await page.locator('form[action="?/create"] button[type="submit"]').click();
    expect(await page.locator('.lite-alert-error').textContent()).toContain('Validation failed');
    expect(await page.locator('[name="status"]').inputValue()).toBe('published');
    expect(await page.locator('.lite-alert-success').count()).toBe(0);
  });

  test('update failure preserves the draft while keeping the route record identity', async () => {
    await page.goto('/lite/posts/edit/1');
    await page.locator('[name="title"]').fill('Retained draft');
    // 模拟记录在打开表单后失效，不改动服务端业务实现。
    await page.locator('[name="_id"]').evaluate(input => {
      (input as HTMLInputElement).value = '999999';
    });
    await page.locator('form[action="?/update"] button[type="submit"]').click();
    expect(await page.locator('.lite-alert-error').textContent()).toContain('Update failed');
    expect(await page.locator('[name="title"]').inputValue()).toBe('Retained draft');
    expect(await page.locator('[name="_id"]').inputValue()).toBe('1');
    await page.locator('form[action="?/update"] a[href="/lite/posts"]').click();
    expect(new URL(page.url()).pathname).toBe('/lite/posts');
  });

  test('failed deletion is visible and cannot produce a success banner', async () => {
    const response = await context.request.post('/lite/posts?/delete', {
      form: { id: '999999' },
      headers: { origin: baseURL, accept: 'text/html' },
    });
    const html = await response.text();
    expect(response.status()).toBe(200);
    expect(html).toContain('Delete failed');
    expect(html).toContain('lite-alert-error');
    expect(html).not.toContain('Operation completed successfully');
  });

  test('empty batch deletion and native search retain usable recovery paths', async () => {
    const response = await context.request.post('/lite/posts?/batchDelete', {
      form: {},
      headers: { origin: baseURL, accept: 'text/html' },
    });
    expect(await response.text()).toContain('No records selected');
    await page.goto('/lite/posts');
    await page.locator('[name="q"]').fill('no-matching-post-pm-audit');
    await page.locator('form[method="GET"] button[type="submit"]').click();
    expect(await page.getByText('No data', { exact: false }).count()
      + await page.getByText('No records found.', { exact: false }).count()).toBeGreaterThan(0);
    expect(await page.locator('a[href="/lite/posts/create"]').count()).toBeGreaterThan(0);
    expect(await page.locator('a[href="/lite/posts"]').count()).toBeGreaterThan(0);
  });
});
