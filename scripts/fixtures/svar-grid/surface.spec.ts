import { test, expect, type Page } from '@playwright/test';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

async function expectSafeFeedback(page: Page, label: string): Promise<void> {
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByRole('alert')).toHaveText(label);
  await expect(page.getByRole('grid')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Surface fixture failed');
  await expect(page.locator('body')).not.toContainText('PRIVATE fixture permission denied');
}

test('a real SVAR grid keeps a provider failure inline and recovers through source refresh', async ({ page }, testInfo) => {
  let fail = true;
  let reads = 0;
  const recovery = deferred();
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/api/surface?**', async route => {
    reads++;
    if (fail) {
      await route.fulfill({ status: 503, json: {} });
      return;
    }
    await recovery.promise;
    await route.fulfill({ json: { data: [{ id: 1, name: 'Recovered inventory', stock: 42 }], total: 1 } });
  });
  await page.goto('/surface.html');

  await expectSafeFeedback(page, 'Table data is unavailable');
  await expect(page.getByTestId('data-error-count')).toHaveText('1');
  await expect(page.getByTestId('data-error-code')).toHaveText('provider_failed');
  await page.screenshot({ path: testInfo.outputPath('surface-provider-error.png'), fullPage: true });
  await page.getByRole('combobox', { name: 'Surface language' }).selectOption('zh-CN');
  await expectSafeFeedback(page, '表格数据不可用');
  await page.getByRole('button', { name: 'Title', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Updated AI inventory', exact: true })).toBeVisible();
  expect(reads).toBe(1);
  await expect(page.getByTestId('data-error-count')).toHaveText('1');

  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect.poll(() => reads).toBe(2);
  await expectSafeFeedback(page, '表格数据不可用');
  await expect(page.getByTestId('data-error-count')).toHaveText('2');

  fail = false;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect.poll(() => reads).toBe(3);
  await expect(page.getByRole('button', { name: 'Refreshing', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Refreshing', exact: true }).evaluate(button => {
    if (!(button instanceof HTMLButtonElement)) throw new Error('Expected a native refresh button');
    button.click();
  });
  expect(reads).toBe(3);
  recovery.resolve();
  await expect(page.getByText('Recovered inventory', { exact: true })).toBeVisible();
  await expect(page.locator('[data-svar-pane="right"]').getByText('42', { exact: true })).toBeVisible();
  await expect(page.getByRole('grid').first()).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  await expect(page.getByTestId('data-error-count')).toHaveText('2');
  await page.screenshot({ path: testInfo.outputPath('surface-provider-recovered.png'), fullPage: true });
  expect(reads).toBe(3);
  expect(pageErrors).toEqual([]);
});

test('revoking access removes real grid data and ignores a late refresh until reauthorized', async ({ page }, testInfo) => {
  let reads = 0;
  const oldRefresh = deferred();
  let lateReplySent = false;
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/api/surface?**', async route => {
    const request = ++reads;
    if (request === 2) {
      await oldRefresh.promise;
      await route.fulfill({ json: { data: [{ id: 2, name: 'Obsolete inventory', stock: 99 }], total: 1 } });
      lateReplySent = true;
      return;
    }
    await route.fulfill({ json: {
      data: [{ id: 1, name: request === 1 ? 'Allowed inventory' : 'Reauthorized inventory', stock: 42 }], total: 1,
    } });
  });
  await page.goto('/surface.html');
  await expect(page.getByText('Allowed inventory', { exact: true })).toBeVisible();
  await expect(page.getByRole('grid').first()).toBeVisible();
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect.poll(() => reads).toBe(2);
  await expect(page.getByRole('button', { name: 'Refreshing', exact: true })).toBeDisabled();

  await page.getByRole('checkbox', { name: 'Allow product reads' }).uncheck();
  await expectSafeFeedback(page, 'Access denied');
  await expect(page.getByText('Allowed inventory', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('data-error-count')).toHaveText('1');
  await expect(page.getByTestId('data-error-code')).toHaveText('access_denied');
  await page.getByRole('combobox', { name: 'Surface language' }).selectOption('zh-CN');
  await expectSafeFeedback(page, '无权访问');
  expect(reads).toBe(2);
  await page.screenshot({ path: testInfo.outputPath('surface-access-denied.png'), fullPage: true });

  oldRefresh.resolve();
  await expect.poll(() => lateReplySent).toBe(true);
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  await expectSafeFeedback(page, '无权访问');
  await expect(page.getByText('Obsolete inventory', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('data-error-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByTestId('data-error-count')).toHaveText('2');
  await expectSafeFeedback(page, '无权访问');
  expect(reads).toBe(2);

  await page.getByRole('checkbox', { name: 'Allow product reads' }).check();
  await expect(page.getByText('Reauthorized inventory', { exact: true })).toBeVisible();
  await expect(page.getByRole('grid').first()).toBeVisible();
  await expect(page.locator('[data-svar-pane="right"]').getByText('42', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByTestId('data-error-count')).toHaveText('2');
  await page.screenshot({ path: testInfo.outputPath('surface-reauthorized.png'), fullPage: true });
  expect(reads).toBe(3);
  expect(pageErrors).toEqual([]);
});

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
