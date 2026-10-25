import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshotDirectory = resolve(process.cwd(), 'output/playwright/dashboard-workspace-20261022');

type DashboardCall = {
  dashboardId: string;
  filters: Array<{ field: string; value: string | number | boolean | null }>;
  timeRange: { from: string; to: string };
};

function expectedCall(region: string, from: string, to: string): DashboardCall {
  return {
    dashboardId: 'home',
    filters: [{ field: 'region', value: region }],
    timeRange: { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` },
  };
}

async function readCalls(page: Page): Promise<DashboardCall[]> {
  const text = await page.getByTestId('dashboard-queries').textContent();
  return JSON.parse(text ?? '[]') as DashboardCall[];
}

async function expectLastCall(page: Page, expected: DashboardCall): Promise<void> {
  await expect.poll(async () => (await readCalls(page)).at(-1)).toEqual(expected);
}

async function expectNoNarrowOverflow(page: Page, testInfo: TestInfo): Promise<void> {
  if (!testInfo.project.name.endsWith('narrow')) return;
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function expectNarrowControlsInViewport(
  page: Page,
  testInfo: TestInfo,
  controls: Array<{ name: string; locator: Locator }>,
): Promise<void> {
  if (!testInfo.project.name.endsWith('narrow')) return;
  await expectNoNarrowOverflow(page, testInfo);
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  for (const control of controls) {
    await expect(control.locator, control.name).toBeVisible();
    const box = await control.locator.boundingBox();
    expect(box, control.name).not.toBeNull();
    expect(box?.x ?? -1, control.name).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0), control.name).toBeLessThanOrEqual(viewport?.width ?? 0);
    expect(box?.y ?? -1, control.name).toBeGreaterThanOrEqual(0);
    expect((box?.y ?? 0) + (box?.height ?? 0), control.name).toBeLessThanOrEqual(viewport?.height ?? 0);
  }
}

async function saveScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: resolve(screenshotDirectory, `${testInfo.project.name}-${name}.png`),
    fullPage: true,
  });
}

test('DashboardWorkspace applies explicit filters and restores them after reload', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=dashboard');

  const region = page.getByLabel('Region filter');
  const from = page.getByLabel('From date');
  const to = page.getByLabel('To date');
  const apply = page.getByRole('button', { name: 'Apply filters' });
  await expect(page.getByRole('heading', { name: 'Operations dashboard' })).toBeVisible();
  await expect(region).toHaveValue('east');
  await expect(from).toHaveValue('2026-10-01');
  await expect(to).toHaveValue('2026-10-31');
  await expect.poll(() => readCalls(page)).toEqual([expectedCall('east', '2026-10-01', '2026-10-31')]);
  await expect(page.getByText('Region east · 2026-10-01 to 2026-10-31')).toBeVisible();
  await expectNarrowControlsInViewport(page, testInfo, [
    { name: 'region filter', locator: region },
    { name: 'from date', locator: from },
    { name: 'to date', locator: to },
    { name: 'apply filters', locator: apply },
  ]);
  await saveScreenshot(page, testInfo, 'initial');

  await region.selectOption('west');
  await from.fill('2026-11-01');
  await to.fill('2026-11-30');
  await apply.click();
  await expectLastCall(page, expectedCall('west', '2026-11-01', '2026-11-30'));
  await expect(page.getByText('Region west · 2026-11-01 to 2026-11-30')).toBeVisible();
  expect(await readCalls(page)).toHaveLength(2);
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('region=west');
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'filtered');

  await page.reload();
  await expect(page.getByLabel('Region filter')).toHaveValue('west');
  await expect(page.getByLabel('From date')).toHaveValue('2026-11-01');
  await expect(page.getByLabel('To date')).toHaveValue('2026-11-30');
  await expect.poll(() => readCalls(page)).toEqual([expectedCall('west', '2026-11-01', '2026-11-30')]);
  await expect(page.getByText('Region west · 2026-11-01 to 2026-11-30')).toBeVisible();
  await expectNarrowControlsInViewport(page, testInfo, [
    { name: 'restored region filter', locator: page.getByLabel('Region filter') },
    { name: 'restored apply filters', locator: page.getByRole('button', { name: 'Apply filters' }) },
  ]);
  await saveScreenshot(page, testInfo, 'reloaded');
  expect(errors).toEqual([]);
});

test('DashboardWorkspace error retry reuses the current filter and time range', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=dashboard&fail=load-once');

  await expect(page.getByRole('alert')).toContainText(/Unable to load dashboard data|无法加载仪表盘数据/);
  await expect.poll(async () => (await readCalls(page)).length).toBe(1);
  expect(await page.locator('body').textContent()).not.toContain('PRIVATE_DASHBOARD_LOAD_DIAGNOSTIC');
  const retry = page.getByRole('button', { name: /^(Retry|重试)$/ });
  await expect(retry).toBeVisible();
  await expectNarrowControlsInViewport(page, testInfo, [{ name: 'retry', locator: retry }]);
  await saveScreenshot(page, testInfo, 'load-failed');

  await retry.click();
  await expect.poll(async () => (await readCalls(page)).length).toBe(2);
  await expectLastCall(page, expectedCall('east', '2026-10-01', '2026-10-31'));
  await expect(page.getByText('Region east · 2026-10-01 to 2026-10-31')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'load-recovered');
  expect(errors).toEqual([]);
});

test('DashboardWorkspace drill-down keeps context and survives reload', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=dashboard');

  await expect(page.getByText('Region east · 2026-10-01 to 2026-10-31')).toBeVisible();
  await page.getByRole('button', { name: /Open work/ }).click();
  const target = page.getByTestId('dashboard-drilldown');
  await expect(target).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Drilldown: Work queue · Open work' })).toBeVisible();
  await expect(target).toContainText('Region east · 2026-10-01 to 2026-10-31');
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('drill=1');
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('widget=work');
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('metric=open');
  await expectNarrowControlsInViewport(page, testInfo, [
    { name: 'drilldown target', locator: target },
    { name: 'back to dashboard', locator: page.getByRole('button', { name: 'Back to dashboard' }) },
  ]);
  await saveScreenshot(page, testInfo, 'drilldown');

  await page.reload();
  await expect(page.getByTestId('dashboard-drilldown')).toBeVisible();
  await expect(page.getByTestId('dashboard-drilldown')).toContainText('Region east · 2026-10-01 to 2026-10-31');
  await expect(page.getByRole('heading', { name: 'Drilldown: Work queue · Open work' })).toBeVisible();
  await expectLastCall(page, expectedCall('east', '2026-10-01', '2026-10-31'));
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'drilldown-reloaded');

  await page.getByRole('button', { name: 'Back to dashboard' }).click();
  await expect(page.getByTestId('dashboard-drilldown')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.location.hash)).not.toContain('drill=1');
  await expect(page.getByText('Region east · 2026-10-01 to 2026-10-31')).toBeVisible();
  expect(errors).toEqual([]);
});