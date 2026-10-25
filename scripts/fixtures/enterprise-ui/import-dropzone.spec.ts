import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?view=import');
});

test.afterEach(async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('PRIVATE_IMPORT_FIXTURE');
});

test('ImportDropzone accepts one file, locks duplicate selection, and recovers after success', async ({ page }) => {
  const zone = page.getByTestId('import-dropzone');
  const input = zone.getByLabel('Choose file', { exact: true });
  await input.setInputFiles({ name: 'report.csv', mimeType: 'text/csv', buffer: Buffer.from('id,name\n1,ready') });
  await expect(input).toBeDisabled();
  await expect(zone.getByRole('status')).toContainText('Importing');
  await input.setInputFiles({ name: 'ignored.csv', mimeType: 'text/csv', buffer: Buffer.from('ignored') });
  await expect(page.getByTestId('import-calls')).toHaveText('1');
  await page.getByRole('button', { name: 'Resolve 1 old', exact: true }).click();
  await expect(input).toBeEnabled();
  await expect(zone.getByRole('status')).toHaveCount(0);
  await expect(page.getByTestId('import-submissions')).toHaveText('0');
  await page.getByRole('button', { name: 'Submit host form', exact: true }).click();
  await expect(page.getByTestId('import-submissions')).toHaveText('1');
});

test('ImportDropzone rejects invalid type without importing and retries a failed import', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const zone = page.getByTestId('import-dropzone');
  const input = zone.getByLabel('Choose file', { exact: true });
  await input.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('notes') });
  await expect(zone.getByRole('alert')).toHaveText('File type is not accepted.');
  await expect(page.getByTestId('import-calls')).toHaveText('0');
  await input.setInputFiles({ name: 'retry.csv', mimeType: 'text/csv', buffer: Buffer.from('retry') });
  await page.getByRole('button', { name: 'Reject 1 old', exact: true }).click();
  await expect(zone.getByRole('alert')).toHaveText('Something went wrong');
  await expect(page.locator('body')).not.toContainText('PRIVATE_IMPORT_FIXTURE');
  await zone.getByRole('button', { name: 'Retry', exact: true }).press('Enter');
  await expect(page.getByTestId('import-calls')).toHaveText('2');
  await expect(page.getByTestId('import-files')).toHaveText('["retry.csv"]');
  await expect(page.getByTestId('import-submissions')).toHaveText('0');
  await page.getByRole('button', { name: 'Resolve 2 old', exact: true }).click();
  await expect(zone.getByRole('alert')).toHaveCount(0);
  await expect(input).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('import-recovery.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('ImportDropzone ignores an old handler result after replacement', async ({ page }) => {
  const zone = page.getByTestId('import-dropzone');
  const input = zone.getByLabel('Choose file', { exact: true });
  await input.setInputFiles({ name: 'old.csv', mimeType: 'text/csv', buffer: Buffer.from('old') });
  await page.getByRole('button', { name: 'Replace importer', exact: true }).click();
  await expect(input).toBeEnabled();
  await input.setInputFiles({ name: 'new.csv', mimeType: 'text/csv', buffer: Buffer.from('new') });
  await expect(input).toBeDisabled();
  await page.getByRole('button', { name: 'Reject 1 old', exact: true }).click();
  await expect(input).toBeDisabled();
  await expect(zone.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Resolve 2 new', exact: true }).click();
  await expect(input).toBeEnabled();
  await expect(zone.getByRole('alert')).toHaveCount(0);
  await expect(page.getByTestId('import-handler')).toHaveText('new');
});
