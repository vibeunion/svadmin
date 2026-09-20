import { expect, test, type Page } from '@playwright/test';
const origin = 'http://127.0.0.1:4178';
async function state(page: Page) { const result = await page.request.post('/__workflow', { headers: { origin }, data: { operation: 'state' } }); expect(result.ok()).toBe(true); return result.json(); }
async function start(page: Page) { await page.goto('/'); await page.getByRole('button', { name: 'Receive first chunk', exact: true }).click(); await expect(page.getByTestId('notice')).toContainText('Streaming'); }
async function accept(page: Page) { await page.getByRole('button', { name: 'Finish stream', exact: true }).click(); await page.getByRole('button', { name: 'Accept surface', exact: true }).click(); await expect(page.getByTestId('notice')).toContainText('Accepted'); }

test('real streaming preview cannot submit; nested forms preserve state; explicit business execution is audited', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await start(page);
  const primary = page.getByRole('region', { name: 'Create primary contact', exact: true });
  await expect(primary.getByRole('button', { name: 'Propose action' })).toBeDisabled();
  const before = await state(page); expect(before.writes).toBe(0);
  await accept(page);
  await primary.getByLabel('Contact name', { exact: false }).fill('Nested test contact');
  await primary.getByRole('button', { name: 'Add item', exact: false }).click();
  await primary.getByLabel('City', { exact: false }).fill('Synthetic City');
  const stable = await state(page);
  await page.getByRole('button', { name: 'Change presentation only' }).click();
  await expect(primary.getByLabel('Contact name', { exact: false })).toHaveValue('Nested test contact');
  await expect(primary.getByLabel('City', { exact: false })).toHaveValue('Synthetic City');
  expect((await state(page)).queries).toBe(stable.queries);
  const ids = await page.locator('input, select').evaluateAll((nodes) => nodes.map((node) => node.id)); expect(new Set(ids).size).toBe(ids.length);
  await primary.getByRole('button', { name: 'Propose action' }).click(); await expect(primary.locator('[data-workflow-status]')).toHaveAttribute('data-workflow-status', 'pending');
  expect((await state(page)).writes).toBe(before.writes);
  await primary.getByRole('button', { name: 'Confirm these arguments' }).click(); await expect(primary.locator('[data-workflow-status]')).toHaveAttribute('data-workflow-status', 'approved');
  expect((await state(page)).writes).toBe(before.writes);
  await primary.getByRole('button', { name: 'Execute approved action' }).click(); await expect(primary.locator('[data-workflow-status]')).toHaveAttribute('data-workflow-status', 'succeeded');
  expect((await state(page)).writes).toBe(before.writes + 1);
  const audit = await page.request.post('/__workflow', { headers: { origin }, data: { operation: 'audit' } });
  const events = await audit.json(); expect(events.map((event: { event: string }) => event.event)).toContain('action.succeeded');
  expect(JSON.stringify(events)).not.toContain('Synthetic City');
  await page.getByRole('button', { name: 'Switch tenant' }).click(); await expect(primary).toHaveCount(0);
  const denied = await page.request.post('/__workflow', { headers: { origin, 'x-fixture-tenant': 'tenant-b' }, data: { operation: 'audit' } }); expect(denied.ok()).toBe(false);
  expect(errors).toEqual([]);
});

for (const [width, height] of [[1440, 900], [1920, 1080], [390, 844]]) {
  test(`streamed form layout ${width}x${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height }); await start(page); await accept(page);
    await expect(page.getByRole('region', { name: 'Create secondary contact', exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const screenshot = testInfo.outputPath(`surface-workflow-${width}x${height}.png`); await page.screenshot({ path: screenshot, fullPage: true });
    await testInfo.attach('state-matrix-accepted', { path: screenshot, contentType: 'image/png' });
  });
}


test('business catalog streams trusted detail and activity while retaining the form and denying private fields', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?business=1');
  await page.getByRole('button', { name: 'Receive first chunk', exact: true }).click();
  await expect(page.getByText('Synthetic detail contact', { exact: true })).toBeVisible();
  await expect(page.getByText('Created contact', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Propose action', exact: true })).toBeDisabled();
  await accept(page);
  await expect(page.getByText('Created contact', { exact: true })).toBeVisible();
  await expect(page.getByText('Synthetic operator', { exact: true })).toBeVisible();
  await expect(page.locator('dl').getByText('No', { exact: true })).toBeVisible();
  await expect(page.locator('dl').getByText('0', { exact: true })).toBeVisible();
  await expect(page.getByText('<img src=x onerror=alert(1)>', { exact: true })).toBeVisible();
  await expect(page.locator('[data-surface-business] img, [data-surface-business] textarea')).toHaveCount(0);
  expect(await page.locator('main').textContent()).not.toContain('private-contact-value');
  expect(await page.locator('main').textContent()).not.toContain('private-event-value');
  const primary = page.getByRole('region', { name: 'Create primary contact', exact: true });
  await primary.getByLabel('Contact name', { exact: false }).fill('Keep business draft');
  const stable = await state(page);
  await page.getByRole('button', { name: 'Change presentation only' }).click();
  await expect(primary.getByLabel('Contact name', { exact: false })).toHaveValue('Keep business draft');
  expect((await state(page)).queries).toBe(stable.queries);
  expect((await state(page)).writes).toBe(stable.writes);
  await page.getByRole('button', { name: 'Request forbidden field' }).click();
  await expect(page.locator('[data-surface-error]')).toContainText('field_denied');
  await expect(page.getByText('Synthetic detail contact', { exact: true })).toHaveCount(0);
  expect((await state(page)).queries).toBe(stable.queries);
  expect(errors).toEqual([]);
});

for (const [width, height] of [[1440, 900], [1920, 1080], [390, 844]]) for (const theme of ['light', 'dark']) {
  test(`business components ${width}x${height} ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height }); await page.goto('/?business=1');
    await page.evaluate((mode) => document.documentElement.classList.toggle('dark', mode === 'dark'), theme);
    await page.getByRole('button', { name: 'Receive first chunk', exact: true }).click(); await accept(page);
    await expect(page.getByText('Created contact', { exact: true })).toBeVisible();
    await expect(page.getByText('Synthetic detail contact', { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    const screenshot = testInfo.outputPath(`surface-business-${width}x${height}-${theme}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    await testInfo.attach('business-accepted', { path: screenshot, contentType: 'image/png' });
  });
}
