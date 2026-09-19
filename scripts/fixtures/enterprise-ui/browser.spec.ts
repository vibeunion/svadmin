import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const screenshots = 'test-results/enterprise/screenshots';
test('typed defaults, enum edits, required clear and retry', async ({ page }) => {
  await page.goto('/');
  const form = page.getByTestId('json-schema-form');
  await form.locator('[name="plan"]').selectOption({ value: '1' });
  await expect(form.locator('[name="plan"]')).toHaveValue('1');
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByTestId('form-result')).toHaveText('{"amount":0,"enabled":false,"plan":2}');
  await form.locator('[name="amount"]').fill('');
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(form.locator('[name="amount"]')).toHaveAttribute('aria-invalid', 'true');
  await form.locator('[name="amount"]').fill('12');
  await page.getByRole('button', { name: 'Fail next submit', exact: true }).click();
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(form.getByRole('alert')).toBeVisible();
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByTestId('form-result')).toHaveText('{"amount":12,"enabled":false,"plan":2}');
});
test('nested editing preserves grouping and blocks partial queries', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-filter-rule]').nth(1).locator('input').fill('10');
  await page.getByTestId('filter-builder-apply').click();
  const result = JSON.parse(await page.getByTestId('query-result').innerText());
  expect(result).toEqual([{ field: 'title', operator: 'contains', value: 'Svelte' }, { operator: 'or', value: [
    { field: 'amount', operator: 'gte', value: 10 }, { operator: 'and', value: [{ field: 'plan', operator: 'eq', value: 1 }] },
  ] }]);
  await page.getByTestId('filter-builder-add-rule').click();
  await page.getByTestId('filter-builder-apply').click();
  await expect(page.getByTestId('filter-builder-errors')).toBeVisible();
  expect(JSON.parse(await page.getByTestId('query-result').innerText())).toEqual(result);
  await page.getByTestId('filter-builder-reset').click();
  await page.getByTestId('filter-builder-apply').click();
  await expect(page.getByTestId('query-result')).toHaveText('[]');
});
test('formula updates and errors work under a CSP without unsafe-eval', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto('/');
  const csp = response?.headers()['content-security-policy'];
  expect(csp).toContain("script-src 'self'");
  expect(csp).not.toContain('unsafe-eval');
  await expect(page.getByLabel('Cell D1', { exact: true })).toHaveValue('#CYCLE!');
  await page.getByLabel('Formula A1', { exact: true }).fill('12');
  await expect(page.getByLabel('Cell B1', { exact: true })).toHaveValue('24');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  await expect(page.getByTestId('csv-result')).toContainText('0.3333333333333333');
  await expect(page.getByTestId('csv-result')).toContainText("'@SUM(1,2)");
  expect(errors).toEqual([]);
});
test('readonly state blocks editing and schema errors disable submission', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Toggle readonly', exact: true }).click();
  await expect(page.getByTestId('filter-builder-apply')).toBeDisabled();
  await expect(page.getByTestId('json-schema-form').locator('[name="amount"]')).toBeDisabled();
  await expect(page.getByLabel('Formula A1', { exact: true })).toHaveAttribute('readonly', '');
  await page.getByRole('button', { name: 'Toggle readonly', exact: true }).click();
  await page.getByRole('button', { name: 'Unsupported schema', exact: true }).click();
  await expect(page.getByTestId('schema-form-errors')).toBeVisible();
  await expect(page.getByTestId('json-schema-form').getByRole('button', { name: 'Submit', exact: true })).toBeDisabled();
});
for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`states and screenshot ${viewport.width}x${viewport.height} ${theme}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto('/');
      await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), theme === 'dark');
      await expect(page.getByTestId('filter-builder')).toBeVisible();
      await expect(page.getByTestId('json-schema-form')).toBeVisible();
      await expect(page.getByLabel('Cell B1', { exact: true })).toHaveValue('4');
      await page.evaluate(() => document.fonts.ready);
      await mkdir(screenshots, { recursive: true });
      await page.screenshot({ path: path.join(screenshots, `ready-${viewport.width}x${viewport.height}-${theme}.png`), fullPage: true });
      await page.getByTestId('filter-builder-add-rule').click();
      await page.getByTestId('filter-builder-apply').click();
      await expect(page.getByTestId('filter-builder-errors')).toBeVisible();
      await page.screenshot({ path: path.join(screenshots, `invalid-${viewport.width}x${viewport.height}-${theme}.png`), fullPage: true });
    });
  }
}
