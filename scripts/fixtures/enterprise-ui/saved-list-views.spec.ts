import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshotDirectory = resolve(process.cwd(), 'output/playwright/saved-list-views-browser-20261022');

async function readLog<T>(page: Page, testId: string): Promise<T[]> {
  const text = await page.getByTestId(testId).textContent();
  return JSON.parse(text ?? '[]') as T[];
}

const searchableFields = ['email', 'team'];

function expectedSearchFilters(value: string): unknown[] {
  return [{
    operator: 'or',
    value: searchableFields.map(field => ({ field, operator: 'contains', value })),
  }];
}

function expectedProviderQuery(value: string) {
  return {
    filters: expectedSearchFilters(value),
    sorters: [],
    pagination: { current: 1, pageSize: 10 },
  };
}

function expectedSavedState(value: string) {
  return {
    search: value,
    filters: [],
    sorters: [],
    pagination: { current: 1, pageSize: 10 },
    columnVisibility: {},
    columnOrder: [],
  };
}

const expectedScope = {
  resourceName: 'saved-view-records',
  providerName: 'default',
};

async function waitForQuery(page: Page, value: string): Promise<void> {
  await expect.poll(async () => {
    const calls = await readLog<{ filters: unknown }>(page, 'saved-list-views-query-calls');
    return calls.at(-1) ?? {};
  }).toEqual(expectedProviderQuery(value));
}

async function openViews(page: Page) {
  const popover = page.locator('.svadmin-popover-content');
  await expect(popover).toBeVisible();
  await expect(popover.getByRole('status')).toHaveCount(0);
  await popover.evaluate(async element => {
    await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => undefined)));
  });
  return popover;
}

async function localValuesContain(page: Page, text: string): Promise<boolean> {
  return page.evaluate((needle) => Object.values(localStorage).some(value => value.includes(needle)), text);
}

async function persistedPersonalState(page: Page, name: string): Promise<unknown> {
  return page.evaluate((viewName) => {
    for (const [key, value] of Object.entries(localStorage)) {
      if (!key.startsWith('svadmin-list-views-v2-')) continue;
      const parsed = JSON.parse(value) as { views?: Array<{ name?: string; state?: unknown }> };
      const view = parsed.views?.find(candidate => candidate.name === viewName);
      if (view) return view.state;
    }
    return undefined;
  }, name);
}

async function expectNarrowControlsInViewport(
  page: Page,
  testInfo: TestInfo,
  controls: Array<{ name: string; locator: ReturnType<Page['locator']> }>,
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

async function expectNoNarrowOverflow(page: Page, testInfo: TestInfo): Promise<void> {
  if (!testInfo.project.name.endsWith('narrow')) return;
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function saveScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: resolve(screenshotDirectory, `${testInfo.project.name}-${name}.png`),
    fullPage: true,
  });
}

test('SavedListViews personal view restores the exact provider query and survives reload', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=saved-list-views');
  const search = page.getByPlaceholder(/^(Search|搜索)/);
  const views = page.getByRole('button', { name: /^(Views|视图)$/, exact: true });
  await expect(search).toBeVisible();
  await expect(views).toBeEnabled();

  await search.fill('alpha');
  await waitForQuery(page, 'alpha');
  await views.click();
  const popover = await openViews(page);
  const personalName = page.getByLabel(/^(View name|视图名称)$/);
  await personalName.fill('Alpha triage');
  await expect(personalName).toHaveValue('Alpha triage');
  const personalSave = page.getByRole('button', { name: /^(Save|保存)$/, exact: true });
  await expect(personalSave).toBeEnabled();
  await personalSave.click();
  await expect(page.locator('#saved-list-view option', { hasText: 'Alpha triage' })).toHaveCount(1);
  expect(await localValuesContain(page, 'Alpha triage')).toBe(true);
  expect(await persistedPersonalState(page, 'Alpha triage')).toEqual(expectedSavedState('alpha'));
  await expectNarrowControlsInViewport(page, testInfo, [
    { name: 'views form', locator: popover },
    { name: 'view name', locator: personalName },
    { name: 'save view', locator: personalSave },
  ]);
  await saveScreenshot(page, testInfo, 'personal-saved-open');

  await page.keyboard.press('Escape');
  await search.fill('beta');
  await waitForQuery(page, 'beta');
  await views.click();
  await page.locator('#saved-list-view').selectOption({ label: 'Alpha triage' });
  await expect(search).toHaveValue('alpha');
  await waitForQuery(page, 'alpha');

  await page.reload();
  await expect(page.getByPlaceholder(/^(Search|搜索)/)).toHaveValue('alpha');
  await waitForQuery(page, 'alpha');
  expect(await persistedPersonalState(page, 'Alpha triage')).toEqual(expectedSavedState('alpha'));
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'personal-restored');
  expect(errors).toEqual([]);
});

test('SavedListViews team save keeps its draft after failure and retries exactly once', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=saved-list-views&fail=save-once');
  const search = page.getByPlaceholder(/^(Search|搜索)/);
  const views = page.getByRole('button', { name: /^(Views|视图)$/, exact: true });
  await expect(search).toBeVisible();
  await expect(views).toBeEnabled();

  await search.fill('gamma');
  await waitForQuery(page, 'gamma');
  await views.click();
  const popover = await openViews(page);
  await page.getByLabel(/^(View ownership|视图归属)$/).selectOption('team');
  const name = page.getByLabel(/^(View name|视图名称)$/);
  await name.fill('Team triage');
  await expect(name).toHaveValue('Team triage');
  const save = page.getByRole('button', { name: /^(Save|保存)$/, exact: true });
  await expect(save).toBeEnabled();
  await save.click();

  await expect(page.getByRole('alert')).toContainText(/Operation failed|操作失败/);
  await expect(name).toHaveValue('Team triage');
  await expect.poll(async () => (await readLog(page, 'saved-list-views-save-calls')).length).toBe(1);
  const listCallsAfterFailure = (await readLog(page, 'saved-list-views-list-calls')).length;
  expect(await page.locator('body').textContent()).not.toContain('PRIVATE_SAVED_VIEW_SAVE_DIAGNOSTIC');
  expect(await localValuesContain(page, 'Team triage')).toBe(false);
  await expectNarrowControlsInViewport(page, testInfo, [
    { name: 'views form', locator: popover },
    { name: 'view name', locator: name },
    { name: 'save view', locator: save },
    { name: 'refresh views', locator: popover.getByRole('button', { name: /^(Refresh|刷新)$/, exact: true }) },
  ]);
  await saveScreenshot(page, testInfo, 'team-save-failed');

  await expect(save).toBeEnabled();
  await save.click();
  await expect.poll(async () => (await readLog(page, 'saved-list-views-save-calls')).length).toBe(2);
  await expect(page.locator('#saved-list-view option', { hasText: 'Team triage' })).toHaveCount(1);
  await expect(name).toHaveValue('');

  const saves = await readLog<{
    scope: Record<string, unknown>;
    mutation: {
      id: string; name: string; source: string; expectedVersion: number | null;
      state: ReturnType<typeof expectedSavedState>;
    };
  }>(page, 'saved-list-views-save-calls');
  expect(saves).toHaveLength(2);
  const [failedSave, retriedSave] = saves;
  for (const saveCall of saves) {
    expect(saveCall.scope).toEqual(expectedScope);
    expect(saveCall.scope).not.toHaveProperty('tenantIdentity');
    expect(saveCall.mutation.name).toBe('Team triage');
    expect(saveCall.mutation.source).toBe('team');
    expect(saveCall.mutation.expectedVersion).toBeNull();
    expect(saveCall.mutation.state).toEqual(expectedSavedState('gamma'));
  }
  expect(failedSave?.mutation.id).toEqual(expect.any(String));
  expect(retriedSave?.mutation.id).toEqual(expect.any(String));
  expect(failedSave?.mutation.state).toEqual(retriedSave?.mutation.state);
  expect(await readLog(page, 'saved-list-views-list-calls')).toHaveLength(listCallsAfterFailure);
  expect(await readLog(page, 'saved-list-views-write-calls')).toEqual([]);
  expect(await localValuesContain(page, 'Team triage')).toBe(false);

  await page.keyboard.press('Escape');
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'team-retried');
  expect(errors).toEqual([]);
});

test('SavedListViews explicit retry restores remote views and read-only views never write', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=saved-list-views&fail=list-once&seed=remote');
  const search = page.getByPlaceholder(/^(Search|搜索)/);
  const views = page.getByRole('button', { name: /^(Views|视图)$/, exact: true });
  await expect(search).toBeVisible();
  await expect(views).toBeEnabled();

  await views.click();
  const popover = await openViews(page);
  const retry = page.getByRole('button', { name: /^(Retry|重试)$/, exact: true });
  await expect(page.getByRole('alert')).toContainText(/Operation failed|操作失败/);
  await expect(retry).toBeVisible();
  await expect.poll(async () => (await readLog(page, 'saved-list-views-list-calls')).length).toBe(1);
  expect(await page.locator('body').textContent()).not.toContain('PRIVATE_SAVED_VIEW_LIST_DIAGNOSTIC');
  await expectNarrowControlsInViewport(page, testInfo, [
    { name: 'views form', locator: popover },
    { name: 'retry views', locator: retry },
  ]);
  await saveScreenshot(page, testInfo, 'remote-list-failed');

  await retry.click();
  await expect.poll(async () => (await readLog(page, 'saved-list-views-list-calls')).length).toBe(2);
  await expect(page.locator('#saved-list-view option', { hasText: 'Team saved' })).toHaveCount(1);
  await expect(page.locator('#saved-list-view option', { hasText: 'System saved' })).toHaveCount(1);

  await page.locator('#saved-list-view').selectOption({ label: 'Team saved' });
  await expect(search).toHaveValue('team-seed');
  await waitForQuery(page, 'team-seed');
  await page.locator('#saved-list-view').selectOption({ label: 'System saved' });
  await expect(search).toHaveValue('system-seed');
  await waitForQuery(page, 'system-seed');
  await expect(page.getByRole('button', { name: /^(Delete|删除) System saved$/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^(Set as default view|设为默认视图) System saved$/ })).toBeDisabled();
  expect(await readLog(page, 'saved-list-views-write-calls')).toEqual([]);
  expect(await page.locator('body').textContent()).not.toContain('PRIVATE_SAVED_VIEW');

  await page.keyboard.press('Escape');
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'remote-recovered');
  expect(errors).toEqual([]);
});
