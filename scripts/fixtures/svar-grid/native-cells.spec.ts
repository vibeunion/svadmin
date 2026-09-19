import { expect, test } from '@playwright/test';

test('real SVAR renders native snippets and keeps callback records independent', async ({ page }) => {
  await page.route('**/api/rows?query=**', route => route.fulfill({ json: { data: [], total: 0 } }));
  await page.goto('/advanced.html');
  await page.getByRole('button', { name: 'native-cells', exact: true }).click();
  await expect(page.locator('[data-native-cell="name"]').first()).toHaveText('Row 00000');
  await page.locator('[data-svar-pane="right"]').getByRole('button', { name: 'Inspect row 0', exact: true }).click();
  await expect(page.getByTestId('native-cell-action')).toHaveText('0:Row 00000');
  await expect(page.locator('[data-native-cell="name"]').first()).toHaveText('Row 00000');
  expect(await page.getByRole('gridcell').count()).toBeLessThan(300);
  await page.locator('[data-svar-pane="center"]').getByText('Stock', { exact: true }).click();
  await expect(page.locator('[data-native-cell="name"]').first()).toHaveText('Row 19999');
  await page.getByRole('button', { name: 'Inspect row 19999', exact: true }).click();
  await expect(page.getByTestId('native-cell-action')).toHaveText('19999:Row 19999');
});
