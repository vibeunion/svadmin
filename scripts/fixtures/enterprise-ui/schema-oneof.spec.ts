import { expect, test } from '@playwright/test';

// 该 fixture 只允许访问本地 Vite 服务；任何业务/外部网络请求都被阻断。
test.beforeEach(async ({ page }) => {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue();
    await route.abort();
  });
});

test('requires an explicit oneOf choice and reports the unselected discriminator', async ({ page }) => {
  await page.goto('/oneof.html');
  const fixture = page.getByTestId('schema-oneof-fixture');
  await expect(fixture).toHaveAttribute('data-case', 'select');
  const form = page.getByTestId('json-schema-form');
  const selector = form.getByLabel('kind');
  await expect(selector).toHaveValue('');
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(form.getByRole('alert')).toBeVisible();
  await expect(selector).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('oneof-submissions')).toHaveText('0');
  await expect(page.getByTestId('oneof-payload')).toHaveText('');
});

test('switches oneOf branches and never submits stale fields from the previous branch', async ({ page }) => {
  await page.goto('/oneof.html');
  const form = page.getByTestId('json-schema-form');
  await form.getByLabel('kind').selectOption('0:0');
  await form.getByLabel('text').fill('ok');
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByTestId('oneof-submissions')).toHaveText('1');
  await expect(page.getByTestId('oneof-payload')).toHaveText('{"choice":{"kind":"text","text":"ok"}}');

  await form.getByLabel('kind').selectOption('1:0');
  await expect(form.getByLabel('text')).toHaveCount(0);
  await form.getByLabel('count').fill('3');
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByTestId('oneof-submissions')).toHaveText('2');
  await expect(page.getByTestId('oneof-payload')).toHaveText('{"choice":{"kind":"count","count":3}}');
});

test('fails closed with a visible configuration error on ambiguous oneOf selectors', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/oneof.html?case=ambiguous');
  await expect(page.getByTestId('schema-oneof-fixture')).toHaveAttribute('data-case', 'ambiguous');
  const form = page.getByTestId('json-schema-form');
  await expect(form.getByRole('alert')).toBeVisible();
  expect(await form.locator('input, select, textarea').count()).toBe(0);
  await expect(form.getByRole('button', { name: 'Submit', exact: true })).toBeDisabled();
  expect(pageErrors).toEqual([]);
});

test('renders the root oneOf selector, blocks unselected submission, and seeds only the explicitly chosen branch', async ({ page }) => {
  await page.goto('/oneof.html?case=root');
  await expect(page.getByTestId('schema-oneof-fixture')).toHaveAttribute('data-case', 'root');
  const form = page.getByTestId('json-schema-form');
  const selector = form.getByLabel('kind');
  await expect(selector).toHaveValue('');
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(form.getByRole('alert')).toBeVisible();
  await expect(selector).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('oneof-submissions')).toHaveText('0');

  await selector.selectOption('0:0');
  await form.getByLabel('text').fill('ok');
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByTestId('oneof-submissions')).toHaveText('1');
  await expect(page.getByTestId('oneof-payload')).toHaveText('{"kind":"text","text":"ok"}');

  await selector.selectOption('1:0');
  await expect(form.getByLabel('text')).toHaveCount(0);
  await expect(form.getByLabel('count')).toHaveValue('5');
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByTestId('oneof-submissions')).toHaveText('2');
  await expect(page.getByTestId('oneof-payload')).toHaveText('{"kind":"count","count":5}');
});

test('seeds an explicitly selected branch default without guessing an unselected branch', async ({ page }) => {
  await page.goto('/oneof.html?case=defaults');
  const form = page.getByTestId('json-schema-form');
  await expect(form.getByLabel('text')).toHaveValue('seeded');
  await expect(form.getByLabel('code')).toHaveValue('A');
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByTestId('oneof-payload')).toHaveText('{"choice":{"kind":"text","text":"seeded","profile":{"code":"A"}}}');

  await form.getByLabel('kind').selectOption('1:0');
  await expect(form.getByLabel('count')).toHaveValue('7');
  await expect(form.getByLabel('text')).toHaveCount(0);
});

test('inherits branch readOnly into the selector and branch controls', async ({ page }) => {
  await page.goto('/oneof.html?case=readonly');
  const form = page.getByTestId('json-schema-form');
  await expect(form.getByLabel('kind')).toBeDisabled();
  await expect(form.getByLabel('text')).toBeDisabled();
  await expect(form.getByLabel('text')).toHaveValue('fixed');
});

test('does not execute a discriminator getter and fails closed', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/oneof.html?case=accessor');
  const form = page.getByTestId('json-schema-form');
  await expect(form.getByRole('alert')).toBeVisible();
  expect(await form.locator('input, select, textarea').count()).toBe(0);
  await expect(page.getByTestId('oneof-accessor-reads')).toHaveText('0');
  expect(pageErrors).toEqual([]);
});
