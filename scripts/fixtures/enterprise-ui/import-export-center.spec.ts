import { expect, test, type Download, type Page, type TestInfo } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page, testInfo: TestInfo): Promise<void> {
  if (!testInfo.project.name.endsWith('narrow')) return;
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function downloadText(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Expected a readable download stream.');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '');
}

const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=import-export');
});

test.afterEach(async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('PRIVATE_IMPORT_WRITE_FIXTURE');
  expect(pageErrors.get(page) ?? []).toEqual([]);
});

test('Import wizard blocks an invalid mapped CSV row before any provider write', async ({ page }, testInfo) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'invalid.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('title,quantity\nValid row,2\nBroken row,not-a-number'),
  });

  await expect(page.getByRole('button', { name: /start import/i })).toBeVisible();
  await page.getByRole('button', { name: /start import/i }).click();

  await expect(page.getByRole('alert')).toContainText('Row 2');
  await expect(page.getByTestId('import-creates')).toHaveText('0');
  await expect(page.getByTestId('import-writes')).toHaveText('[]');
  await expect(page.getByTestId('import-result')).toHaveText('none');
  await expect(page.getByRole('button', { name: /start import/i })).toBeVisible();
  await expectNoHorizontalOverflow(page, testInfo);
});

test('Import wizard writes valid mapped rows, reports partial failure and downloads its failed CSV', async ({ page }, testInfo) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'partial.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('title,quantity\nAlpha,2\nReject me,3\nGamma,4'),
  });

  await page.getByRole('button', { name: /start import/i }).click();

  await expect(page.getByTestId('import-result')).toHaveText('{"succeeded":2,"failed":1}');
  await expect(page.getByTestId('import-creates')).toHaveText('3');
  await expect(page.getByTestId('import-writes')).toHaveText('[{"title":"Alpha","quantity":2},{"title":"Gamma","quantity":4}]');
  await expect(page.getByText('1 records failed to import.')).toBeVisible();

  const downloads: Download[] = [];
  page.on('download', download => downloads.push(download));
  await page.getByRole('button', { name: /download failed csv/i }).click();
  await expect.poll(() => downloads.length).toBe(1);
  const download = downloads[0];
  if (!download) throw new Error('Expected exactly one failed CSV download.');
  expect(download.suggestedFilename()).toBe('browser-import-import-errors.csv');
  const content = await downloadText(download);
  expect(content).toBe('title,quantity,_error_reason\nReject me,3,Import failed');
  expect(content).not.toContain('PRIVATE_IMPORT_WRITE_FIXTURE');
  expect(content).not.toContain('Alpha');
  expect(content).not.toContain('Gamma');
  await expectNoHorizontalOverflow(page, testInfo);
});

test('ExportButton restores a completed export task and performs only the explicit artifact download', async ({ page }, testInfo) => {
  const downloads: Download[] = [];
  page.on('download', download => downloads.push(download));
  await page.goto('/?view=import-export&panel=export');
  const downloadButton = page.getByRole('button', { name: /^download$/i });
  await expect(downloadButton).toBeEnabled();
  await expect(page.getByTestId('export-task-gets')).not.toHaveText('0');
  await expect(page.getByTestId('export-task-submits')).toHaveText('0');
  expect(downloads).toHaveLength(0);

  await downloadButton.click();
  await expect.poll(() => downloads.length).toBe(1);
  const download = downloads[0];
  if (!download) throw new Error('Expected exactly one artifact download.');

  expect(download.suggestedFilename()).toBe('browser-export_export.csv');
  const content = await downloadText(download);
  const lines = content.trim().split(/\r?\n/);
  expect(lines).toHaveLength(6);
  expect(lines[0]).toBe('id,title,quantity');
  expect(lines.slice(1)).toEqual([
    '1,Record 1,1',
    '2,Record 2,2',
    '3,Record 3,3',
    '4,Record 4,4',
    '5,Record 5,5',
  ]);
  expect(downloads).toHaveLength(1);
  await expect(page.getByTestId('export-task-submits')).toHaveText('0');
  await expectNoHorizontalOverflow(page, testInfo);
});

test('Import preview-only mode returns to mapping, blocks a changed mapping, then writes after correction', async ({ page }, testInfo) => {
  await page.goto('/?view=import-export&panel=preview-import');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'preview-import.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('title,quantity\nAlpha,2\nBeta,3'),
  });

  await page.getByRole('button', { name: /^preview$/i }).click();
  await expect(page.getByTestId('preview-result')).toHaveText(JSON.stringify({
    totalRows: 2,
    importableRows: 2,
    failedRows: [],
  }));
  await expect(page.getByTestId('import-creates')).toHaveText('0');
  await expect(page.getByTestId('import-writes')).toHaveText('[]');
  await expect(page.getByTestId('import-result')).toHaveText('none');

  await page.getByRole('button', { name: /back to import/i }).click();
  await expect(page.getByRole('combobox', { name: 'Map quantity' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Map quantity' }).selectOption('');
  await page.getByRole('button', { name: /start import/i }).click();
  await expect(page.getByRole('alert')).toContainText('Row 1');
  await expect(page.getByTestId('import-creates')).toHaveText('0');
  await expect(page.getByTestId('import-writes')).toHaveText('[]');
  await expect(page.getByTestId('import-result')).toHaveText('none');

  await page.getByRole('combobox', { name: 'Map quantity' }).selectOption('quantity');
  await page.getByRole('button', { name: /start import/i }).click();
  await expect(page.getByTestId('import-result')).toHaveText('{"succeeded":2,"failed":0}');
  await expect(page.getByTestId('import-creates')).toHaveText('2');
  await expect(page.getByTestId('import-writes')).toHaveText('[{"title":"Alpha","quantity":2},{"title":"Beta","quantity":3}]');
  await expectNoHorizontalOverflow(page, testInfo);
});

test('Import wizard dry run previews rows, performs no write and returns to import', async ({ page }, testInfo) => {
  await page.goto('/?view=import-export&panel=preview');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'preview.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('title,quantity\nAlpha,2\nBroken,not-a-number'),
  });

  await page.getByRole('button', { name: /preview import/i }).click();

  await expect(page.getByTestId('preview-result')).toHaveText(JSON.stringify({
    totalRows: 2,
    importableRows: 1,
    failedRows: [{ row: 2, error: 'Invalid import input' }],
  }));
  await expect(page.getByText('Row 2: Invalid import input')).toBeVisible();
  await expect(page.getByTestId('import-creates')).toHaveText('0');
  await expect(page.getByTestId('import-writes')).toHaveText('[]');
  await expect(page.getByRole('button', { name: /start import/i })).toHaveCount(0);

  await page.getByRole('button', { name: /back to import/i }).click();
  await expect(page.getByRole('button', { name: /preview import/i })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Map title' })).toBeVisible();
  await expect(page.getByTestId('import-creates')).toHaveText('0');
  await expect(page.getByTestId('import-writes')).toHaveText('[]');
  await expectNoHorizontalOverflow(page, testInfo);
});
