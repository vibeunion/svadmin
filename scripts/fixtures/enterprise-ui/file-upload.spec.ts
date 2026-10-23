import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?view=upload');
});

test.afterEach(async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('PRIVATE_UPLOAD_FIXTURE');
});

test('FileUpload cancels, retries, and ignores the old upload result', async ({ page }) => {
  const upload = page.getByTestId('file-upload');
  const input = upload.locator('input[type="file"]');
  await input.setInputFiles({ name: 'retry.csv', mimeType: 'text/csv', buffer: Buffer.from('retry') });
  await expect(upload.getByText('44%')).toBeVisible();
  await expect(upload.getByRole('button', { name: 'Cancel upload', exact: true })).toBeEnabled();
  await upload.getByRole('button', { name: 'Cancel upload', exact: true }).press('Enter');
  await expect(upload.getByRole('button', { name: 'Retry upload', exact: true })).toBeEnabled();
  await expect(page.getByTestId('upload-cancellation')).toHaveText('cancel');
  await expect(page.getByTestId('upload-cancels')).toHaveText('1');
  await page.getByRole('button', { name: 'Resolve 1', exact: true }).click();
  await expect(upload.getByRole('button', { name: 'Retry upload', exact: true })).toBeEnabled();
  await upload.getByRole('button', { name: 'Retry upload', exact: true }).press('Space');
  await expect(page.getByTestId('upload-calls')).toHaveText('2');
  await page.getByRole('button', { name: 'Resolve 2', exact: true }).click();
  await expect(page.getByTestId('upload-items')).toHaveText('[{"name":"retry.csv","status":"success","progress":100,"url":"/uploads/2.bin"}]');
  await expect(upload.getByRole('button', { name: 'Remove file', exact: true })).toBeEnabled();
  await expect(page.locator('body')).not.toContainText('PRIVATE_UPLOAD_FIXTURE');
});

test('FileUpload rejects invalid type and size without starting an upload', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const upload = page.getByTestId('file-upload');
  const input = upload.locator('input[type="file"]');
  await input.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('notes') });
  await expect(upload.getByRole('list', { name: 'Rejected files', exact: true })).toContainText('File type is not accepted.');
  await expect(page.getByTestId('upload-calls')).toHaveText('0');
  await input.setInputFiles({ name: 'large.csv', mimeType: 'text/csv', buffer: Buffer.from('123456789') });
  await expect(upload.getByRole('list', { name: 'Rejected files', exact: true })).toContainText('File is too large.');
  await expect(page.getByTestId('upload-calls')).toHaveText('0');
  await page.getByRole('button', { name: 'Submit host form', exact: true }).click();
  await expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('file-upload-rejected.png'), fullPage: true });
});
