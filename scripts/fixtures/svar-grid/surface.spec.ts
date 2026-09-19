import { test, expect } from '@playwright/test';

test('AI catalog renders real SVAR and rejects field and mutation escalation', async ({ page }) => {
  let reads = 0;
  await page.route('**/api/surface?**', async route => {
    reads++; await route.fulfill({ json: { data: [{ id: 1, name: 'Allowed inventory', stock: 42, secret: 'Never reveal this' }], total: 1 } });
  });
  await page.goto('/surface.html');
  await expect(page.getByTestId('prompt-grid')).toHaveText('registered');
  await expect(page.getByTestId('proposal-valid')).toHaveText('valid');
  await expect(page.getByText('Allowed inventory', { exact: true })).toBeVisible();
  await expect(page.locator('[data-svar-pane="right"]').getByText('42', { exact: true })).toBeVisible();
  await expect(page.getByText('Never reveal this', { exact: true })).toHaveCount(0);
  const before = reads;
  await page.getByRole('button', { name: 'mutation', exact: true }).click();
  await expect(page.getByTestId('proposal-valid')).toHaveText('rejected');
  await expect(page.getByRole('grid')).toHaveCount(0); expect(reads).toBe(before);
  await page.getByRole('button', { name: 'secret', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('not readable'); expect(reads).toBe(before);
  await page.getByRole('button', { name: 'deny-id', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('id'); expect(reads).toBe(before);
  await page.getByRole('button', { name: 'valid', exact: true }).click();
  await expect(page.getByText('Allowed inventory', { exact: true })).toBeVisible();
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
  test(`Surface real grid evidence at ${viewport.width}`, async ({ page }, testInfo) => {
    await page.route('**/api/surface?**', route => route.fulfill({ json: { data: [{ id: 1, name: 'AI-bound inventory', stock: 42 }], total: 1 } }));
    await page.setViewportSize(viewport); await page.goto('/surface.html');
    await expect(page.getByText('AI-bound inventory', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`surface-${viewport.width}.png`), fullPage: true });
  });
}
