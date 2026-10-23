import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshotDirectory = resolve(process.cwd(), 'output/playwright/dashboard-workspace-example-20261022');

async function login(page: Page): Promise<void> {
  await page.goto('/#/login');
  const identifier = page.locator('#login-identifier');
  await identifier.waitFor({ state: 'visible', timeout: 20_000 });
  await identifier.fill('admin@example.com');
  await page.locator('#login-password').fill('demo');
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByRole('heading', { name: /Operations workspace|运营工作台/ })).toBeVisible({ timeout: 20_000 });
}

async function expectWorkspace(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: /Enterprise dashboard workspace|企业仪表盘工作区/ })).toBeVisible();
  await expect(page.getByText(/Region east · 2026-06-01 to 2026-06-30/)).toBeVisible();
}

async function expectNoNarrowOverflow(page: Page, testInfo: TestInfo): Promise<void> {
  if (!testInfo.project.name.endsWith('narrow')) return;
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function waitForStableOpacity(target: Locator): Promise<void> {
  await expect(target).toBeVisible();
  await expect.poll(async () => target.evaluate(async (element) => {
    const chain: Element[] = [];
    for (let node: Element | null = element; node; node = node.parentElement) chain.push(node);
    await Promise.all(chain.flatMap(node => node.getAnimations({ subtree: false }).map(async animation => {
      const timing = animation.effect?.getTiming();
      if (timing?.iterations === Infinity) return;
      await animation.finished.catch(() => undefined);
    })));
    return chain.every(node => Number.parseFloat(getComputedStyle(node).opacity) >= 0.999);
  })).toBe(true);
}

async function saveScreenshot(page: Page, testInfo: TestInfo, name: string, stableTarget?: Locator): Promise<void> {
  if (stableTarget) await waitForStableOpacity(stableTarget);
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: resolve(screenshotDirectory, `${testInfo.project.name}-${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
}

test('real example dashboard applies filters and restores them after reload', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page);
  await expectWorkspace(page);

  const region = page.getByLabel('Region filter');
  const from = page.getByLabel('From date');
  const to = page.getByLabel('To date');
  await expect(region).toHaveValue('east');
  await expect(from).toHaveValue('2026-06-01');
  await expect(to).toHaveValue('2026-06-30');
  await saveScreenshot(page, testInfo, 'initial');

  await region.selectOption('west');
  await from.fill('2026-06-01');
  await to.fill('2026-06-15');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByText(/Region west · 2026-06-01 to 2026-06-15/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('region=west');
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('from=2026-06-01');
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'filtered');

  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations workspace|运营工作台/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel('Region filter')).toHaveValue('west');
  await expect(page.getByLabel('From date')).toHaveValue('2026-06-01');
  await expect(page.getByLabel('To date')).toHaveValue('2026-06-15');
  await expect(page.getByText(/Region west · 2026-06-01 to 2026-06-15/)).toBeVisible();
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'reloaded');
  expect(errors).toEqual([]);
});

test('real example dashboard drill-down keeps context and survives reload', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page);
  await expectWorkspace(page);

  await page.getByRole('button', { name: /Units moved/ }).click();
  const target = page.getByTestId('dashboard-drilldown');
  await expect(target).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Drilldown: Workspace metrics · Units moved' })).toBeVisible();
  await expect(target).toContainText('Region east · 2026-06-01 to 2026-06-30');
  const firstRecord = target.getByRole('link', { name: 'Initial receiving' });
  await expect(firstRecord).toBeVisible();
  await expect(target.getByRole('link', { name: 'Sales order shipment' })).toBeVisible();
  await expect(target).toContainText('2 records');
  const firstRecordHref = await firstRecord.getAttribute('href');
  expect(firstRecordHref).toMatch(/^#\/stock_movements\/show\/1\?/);
  expect(firstRecordHref).toContain('returnTo=');
  expect(firstRecordHref).toContain('region%3Deast');
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('drill=1');
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('widget=workspace-metrics');
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('metric=units');
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'drilldown');

  await firstRecord.click();
  await expect(page).toHaveURL(/\/stock_movements\/show\/1\?/);
  const detail = page.locator('[data-svadmin-crud-page="show"][data-svadmin-record-id="1"]');
  await expect(detail).toBeVisible();
  await expect(page.getByRole('heading', { name: /Stock Movements.*#1|库存流水.*#1/ })).toBeVisible();
  await expect(detail).toContainText('Initial receiving');
  await expect(detail).toContainText('Quantity');
  await saveScreenshot(page, testInfo, 'detail', detail);

  await page.getByRole('button', { name: /^(Back|返回)$/ }).first().click();
  await expect(page.getByTestId('dashboard-drilldown')).toBeVisible();
  await expect(page.getByLabel('Region filter')).toHaveValue('east');
  await expect(page.getByLabel('From date')).toHaveValue('2026-06-01');
  await expect(page.getByLabel('To date')).toHaveValue('2026-06-30');
  await expect(page.getByRole('heading', { name: 'Drilldown: Workspace metrics · Units moved' })).toBeVisible();
  await expect(page.getByTestId('dashboard-drilldown').getByRole('link', { name: 'Initial receiving' })).toBeVisible();
  await expect(page.getByTestId('dashboard-drilldown')).toContainText('2 records');
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'detail-returned', page.getByTestId('dashboard-drilldown'));

  await page.reload();
  await expect(page.getByRole('heading', { name: /Operations workspace|运营工作台/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('dashboard-drilldown')).toBeVisible();
  await expect(page.getByTestId('dashboard-drilldown')).toContainText('Region east · 2026-06-01 to 2026-06-30');
  await expect(page.getByRole('heading', { name: 'Drilldown: Workspace metrics · Units moved' })).toBeVisible();
  await expect(page.getByTestId('dashboard-drilldown').getByRole('link', { name: 'Initial receiving' })).toBeVisible();
  await expect(page.getByTestId('dashboard-drilldown')).toContainText('2 records');
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'drilldown-reloaded');

  await page.getByRole('button', { name: 'Back to dashboard' }).click();
  await expect(page.getByTestId('dashboard-drilldown')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.location.hash)).not.toContain('drill=1');
  await expect(page.getByText(/Region east · 2026-06-01 to 2026-06-30/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('real example dashboard rejects an unknown region instead of widening scope', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page);
  await page.goto('/#/?region=central&from=2026-06-01&to=2026-06-30');
  await expect(page.getByRole('heading', { name: /Operations workspace|运营工作台/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('alert')).toContainText(/Unable to load dashboard data|无法加载仪表盘数据/);
  await expect(page.getByText(/Region all/)).toHaveCount(0);
  expect(await page.locator('body').textContent()).not.toContain('Unsupported dashboard region');
  expect(errors).toEqual([]);
});