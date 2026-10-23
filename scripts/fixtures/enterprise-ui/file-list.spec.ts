import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?view=files');
});

test.afterEach(async ({ page }) => {
  await expect(page.locator('body')).not.toContainText('PRIVATE_FILE_FIXTURE');
});

for (const action of ['Preview', 'Download', 'Remove']) {
  test(`FileList ${action} keyboard failure and retry stay row-local`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const list = page.getByTestId('file-list');
    const first = list.getByRole('listitem', { name: 'report.pdf', exact: true });
    const second = list.getByRole('listitem', { name: 'sheet.csv', exact: true });
    const button = first.getByRole('button', { name: `${action} report.pdf`, exact: true });
    await button.press('Enter');
    await expect(first).toHaveAttribute('aria-busy', 'true');
    for (const label of ['Preview', 'Download', 'Remove']) {
      await expect(first.getByRole('button', { name: `${label} report.pdf`, exact: true })).toBeDisabled();
      await expect(second.getByRole('button', { name: `${label} sheet.csv`, exact: true })).toBeEnabled();
    }
    await second.getByRole('button', { name: 'Download sheet.csv', exact: true }).press('Space');
    await expect(page.getByTestId('file-calls')).toHaveText('2');
    await page.getByRole('button', { name: 'Resolve 2', exact: true }).click();
    await expect(second).toHaveAttribute('aria-busy', 'false');
    await expect(button).toBeDisabled();
    await page.getByRole('button', { name: 'Reject 1', exact: true }).click();
    const alert = first.getByRole('alert');
    await expect(alert).toContainText(`${action}: Something went wrong`);
    await expect(button).toHaveAttribute('aria-describedby', await alert.getAttribute('id') ?? '');
    await expect(second.getByRole('alert')).toHaveCount(0);
    await expect(button).toBeEnabled();
    await expect(page.getByTestId('file-submissions')).toHaveText('0');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`file-${action.toLowerCase()}-error.png`), fullPage: true });
    await button.press('Space');
    await expect(alert).toHaveCount(0);
    await expect(button).not.toHaveAttribute('aria-describedby');
    await expect(page.getByTestId('file-action')).toHaveText(`${action.toLowerCase()}:report.pdf`);
    await page.getByRole('button', { name: 'Resolve 3', exact: true }).click();
    await expect(button).toBeEnabled();
    await expect(first).toBeVisible();
    await expect(page.getByTestId('file-calls')).toHaveText('3');
    await page.getByRole('button', { name: 'Submit host form', exact: true }).click();
    await expect(page.getByTestId('file-submissions')).toHaveText('1');
    expect(errors).toEqual([]);
  });
}

for (const outcome of ['Resolve', 'Reject']) {
  test(`FileList ignores old ${outcome} while a replacement file is pending`, async ({ page }) => {
    const button = page.getByRole('button', { name: 'Download report.pdf', exact: true });
    await button.click();
    await page.getByRole('button', { name: 'Replace files', exact: true }).click();
    await expect(button).toBeEnabled();
    await button.click();
    await page.getByRole('button', { name: `${outcome} 1`, exact: true }).click();
    await expect(button).toBeDisabled();
    await expect(page.getByTestId('file-list').getByRole('alert')).toHaveCount(0);
    await page.getByRole('button', { name: 'Resolve 2', exact: true }).click();
    await expect(button).toBeEnabled();
    await expect(page.getByTestId('file-calls')).toHaveText('2');
  });
}

test('FileList preserves unique row locks through reorder and isolates duplicate ids', async ({ page }) => {
  const list = page.getByTestId('file-list');
  const report = list.getByRole('button', { name: 'Download report.pdf', exact: true });
  const sheet = list.getByRole('button', { name: 'Download sheet.csv', exact: true });
  await report.click();
  await page.getByRole('button', { name: 'Reverse files', exact: true }).click();
  await expect(list.getByRole('listitem').first()).toHaveAttribute('aria-label', 'sheet.csv');
  await expect(report).toBeDisabled();
  await page.getByRole('button', { name: 'Resolve 1', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicate ids', exact: true }).click();
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await report.click();
  await sheet.click();
  await page.getByRole('button', { name: 'Reject 2', exact: true }).click();
  await expect(list.getByRole('listitem', { name: 'report.pdf', exact: true }).getByRole('alert')).toBeVisible();
  await expect(sheet).toBeDisabled();
  await page.getByRole('button', { name: 'Resolve 3', exact: true }).click();
  await expect(sheet).toBeEnabled();
  await expect(list.getByRole('listitem', { name: 'sheet.csv', exact: true }).getByRole('alert')).toHaveCount(0);
});
