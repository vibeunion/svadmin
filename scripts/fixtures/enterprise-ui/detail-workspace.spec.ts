import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshotDirectory = resolve(process.cwd(), 'output/playwright/detail-workspace-browser-20261022');

type ProviderCall = {
  resourceName: string;
  recordId: string | number;
  meta?: Record<string, unknown>;
};

type CallLogKey = 'detail' | 'attachments' | 'activity' | 'audit' | 'versions' | 'permissions';

type CallLogs = Record<CallLogKey, unknown[]>;

type SectionKey = 'attachments' | 'activity' | 'audit' | 'versions';

async function readLog<T>(page: Page, key: CallLogKey): Promise<T[]> {
  return await page.evaluate((logKey) => {
    const logs = (window as Window & { __detailWorkspaceCalls?: CallLogs }).__detailWorkspaceCalls;
    return (logs?.[logKey] ?? []) as unknown[];
  }, key) as T[];
}

function detailButton(page: Page, id: number): Locator {
  // The narrow layout switches from table rows to cards, so bind to the list region
  // and deterministic row order instead of a table-only row wrapper.
  return page
    .getByRole('region', { name: /(Detail workspace records|详情工作台记录) List/ })
    .getByRole('button', { name: /^(Detail|详情)$/ })
    .nth(id - 1);
}

function detailDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: /Detail workspace records|详情工作台记录/ });
}

function section(dialog: Locator, name: string): Locator {
  return dialog.locator(`[data-svadmin-detail-section="${name}"]`);
}

async function waitForAnimations(locator: Locator): Promise<void> {
  await locator.evaluate(async element => {
    await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => undefined)));
  });
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

async function openRecordDetail(page: Page, id: number): Promise<Locator> {
  const trigger = detailButton(page, id);
  await expect(trigger).toBeVisible();
  // Keyboard activation keeps the trigger as the restore target in every engine
  // (WebKit does not focus buttons on pointer click).
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = detailDialog(page);
  await expect(dialog).toBeVisible();
  await waitForAnimations(dialog);
  return dialog;
}

type ProviderKey = 'A' | 'B';

type PendingEntry = { provider: ProviderKey; section: SectionKey; recordId: string };

type ProviderScopeCall = ProviderCall & { provider: ProviderKey };

async function readPending(page: Page): Promise<PendingEntry[]> {
  return await page.evaluate(() => {
    const control = (window as Window & {
      __detailWorkspaceControl?: { pending: () => PendingEntry[] };
    }).__detailWorkspaceControl;
    return control?.pending() ?? [];
  });
}

async function settleProvider(
  page: Page,
  provider: ProviderKey,
  recordId: string,
  outcome: 'success' | 'failure',
  sections?: SectionKey[],
): Promise<void> {
  await page.evaluate(({ providerKey, id, result, only }) => {
    const control = (window as Window & {
      __detailWorkspaceControl?: {
        settleFor: (
          provider: string,
          recordId: string,
          outcome: 'success' | 'failure',
          sections?: string[],
        ) => unknown;
      };
    }).__detailWorkspaceControl;
    control?.settleFor(providerKey, id, result, only);
  }, { providerKey: provider, id: recordId, result: outcome, only: sections });
}

function pendingShape(entries: PendingEntry[]): string[] {
  return entries.map(entry => `${entry.provider}:${entry.recordId}:${entry.section}`).sort();
}

// Every logged call of `provider` must be exactly one full scope for `recordId`;
// the other provider's record identity must never appear under this provider.
async function expectProviderScopes(
  page: Page,
  provider: ProviderKey,
  recordId: number,
  count: number,
): Promise<void> {
  for (const key of ['attachments', 'activity', 'audit', 'versions'] as const) {
    const log = await readLog<ProviderScopeCall>(page, key);
    const scoped = log.filter(call => call.provider === provider);
    expect(scoped, `${provider}/${key}`).toHaveLength(count);
    for (const call of scoped) {
      expect(call, `${provider}/${key}`).toEqual({
        resourceName: 'detail-workspace-records',
        recordId,
        meta: { recordId },
        provider,
      });
    }
  }
}

test('DetailWorkspace shows five real sections with record-scoped content after opening the detail drawer', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=detail-workspace');

  await expect(page.getByTestId('detail-workspace-browser-fixture')).toBeVisible();
  const dialog = await openRecordDetail(page, 1);

  const workspace = dialog.locator('[data-svadmin-detail-workspace]');
  await expect(workspace).toHaveAttribute('data-svadmin-detail-resource', 'detail-workspace-records');
  await expect(workspace).toHaveAttribute('data-svadmin-detail-record', '1');

  await expect(dialog.getByRole('heading', { name: /^(Related records|关联记录)$/ })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: /^(Attachments|附件)$/ })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: /^(Activity|活动)$/ })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: /^(Audit|审计)$/ })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: /^(Version differences|版本差异)$/ })).toBeVisible();

  await expect(page.getByTestId('detail-workspace-relations-content')).toContainText('Related records for 1');
  await expect(section(dialog, 'attachments')).toContainText('attachment-record-1.txt');
  await expect(section(dialog, 'activity')).toContainText('activity for record 1');
  await expect(section(dialog, 'audit')).toContainText('audit for record 1');
  const versions = section(dialog, 'versions');
  await expect(versions).toContainText('draft');
  await expect(versions).toContainText('published');

  // Page-level overflow checks cannot see a control clipped by an inner
  // overflow-hidden card, so measure the diff mode buttons against every
  // clipping ancestor as well as the viewport.
  const splitButton = versions.getByRole('button', { name: 'Side by Side' });
  const unifiedButton = versions.getByRole('button', { name: 'Unified' });
  await expect(splitButton).toBeVisible();
  await expect(unifiedButton).toBeVisible();
  if (testInfo.project.name.endsWith('narrow')) {
    for (const button of [splitButton, unifiedButton]) {
      const geometry = await button.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const clips: string[] = [];
        for (let node = element.parentElement; node; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (!/(hidden|clip|auto|scroll)/u.test(`${style.overflowX} ${style.overflowY}`)) continue;
          const box = node.getBoundingClientRect();
          if (rect.left < box.left - 0.5 || rect.right > box.right + 0.5) clips.push(node.tagName);
        }
        return { left: rect.left, right: rect.right, width: rect.width, viewport: window.innerWidth, clips };
      });
      expect(geometry.width).toBeGreaterThan(0);
      expect(geometry.left).toBeGreaterThanOrEqual(-0.5);
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 0.5);
      expect(geometry.clips).toEqual([]);
    }
  }

  // Real interaction, not just geometry: switching modes must render the
  // unified diff and switching back must restore the split view.
  await unifiedButton.click();
  await expect(versions).toContainText('- draft');
  await expect(versions).toContainText('+ published');
  await splitButton.click();
  await expect(versions).not.toContainText('- draft');
  await expect(versions).toContainText('draft');
  await expect(versions).toContainText('published');

  for (const [key, calls] of [
    ['detail', await readLog<{ resource: string; id: number }>(page, 'detail')],
    ['attachments', await readLog<ProviderCall>(page, 'attachments')],
    ['activity', await readLog<ProviderCall>(page, 'activity')],
    ['audit', await readLog<ProviderCall>(page, 'audit')],
    ['versions', await readLog<ProviderCall>(page, 'versions')],
  ] as const) {
    expect(calls.length, key).toBeGreaterThan(0);
    expect(calls.at(-1), key).toEqual(expect.objectContaining({
      ...(key === 'detail'
        ? { resource: 'detail-workspace-records', id: 1 }
        : { resourceName: 'detail-workspace-records', recordId: 1 }),
    }));
  }

  expect(await page.locator('body').textContent()).not.toContain('PRIVATE_DETAIL_WORKSPACE');
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'five-sections-open');
  expect(errors).toEqual([]);
});

test('DetailWorkspace attachment provider failure shows Retry and recovers the real FileList after a retry', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=detail-workspace&fail=attachments-once');

  const dialog = await openRecordDetail(page, 1);
  const attachments = section(dialog, 'attachments');

  await expect(attachments.getByRole('alert')).toContainText(/Operation failed|操作失败/);
  await expect(attachments.getByRole('button', { name: /^(Retry|重试)$/ })).toBeVisible();
  await expect(attachments).not.toContainText('attachment-record-1.txt');
  expect(await readLog<ProviderCall>(page, 'attachments')).toHaveLength(1);
  expect(await page.locator('body').textContent()).not.toContain('PRIVATE_DETAIL_WORKSPACE_ATTACHMENT_DIAGNOSTIC');
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'attachments-failed');

  await attachments.getByRole('button', { name: /^(Retry|重试)$/ }).click();
  await expect(attachments).toContainText('attachment-record-1.txt');
  await expect(attachments.getByRole('alert')).toHaveCount(0);
  await expect.poll(async () => (
    await readLog<ProviderCall>(page, 'attachments')
  ).length).toBe(2);
  const calls = await readLog<ProviderCall>(page, 'attachments');
  for (const call of calls) {
    expect(call).toEqual(expect.objectContaining({ resourceName: 'detail-workspace-records', recordId: 1 }));
  }

  await saveScreenshot(page, testInfo, 'attachments-recovered');
  expect(errors).toEqual([]);
});

test('DetailWorkspace closes the detail drawer on Escape and returns focus to the row detail button', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=detail-workspace');

  const dialog = await openRecordDetail(page, 1);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(detailButton(page, 1)).toBeFocused();
  await expect(page.locator('[data-svadmin-detail-workspace]')).toHaveCount(0);
  await expect(page.getByTestId('detail-workspace-route-detail')).toHaveText('');

  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'escape-restored-focus');
  expect(errors).toEqual([]);
});

test('DetailWorkspace neither reads nor renders the detail area when show permission is denied', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=detail-workspace&deny=show');

  await expect(page.getByText('record one', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect.poll(async () => (
    await readLog<{ action: string }>(page, 'permissions')
  ).some(call => call.action === 'show')).toBe(true);
  await expect(detailButton(page, 1)).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-svadmin-detail-workspace]')).toHaveCount(0);

  expect(await readLog(page, 'detail')).toEqual([]);
  expect(await readLog(page, 'attachments')).toEqual([]);
  expect(await readLog(page, 'activity')).toEqual([]);
  expect(await readLog(page, 'audit')).toEqual([]);
  expect(await readLog(page, 'versions')).toEqual([]);
  expect(await page.locator('body').textContent()).not.toContain('PRIVATE_DETAIL_WORKSPACE');

  await page.keyboard.press('Escape');
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'show-denied');
  expect(errors).toEqual([]);
});
test('DetailWorkspace clears record A immediately when record B is pending and ignores late A results', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=detail-workspace&controlled=deferred');

  const pendingLoads = async () => await page.evaluate(() => {
    const control = (window as Window & {
      __detailWorkspaceControl?: {
        pending: () => { section: string; recordId: string }[];
      };
    }).__detailWorkspaceControl;
    return control?.pending() ?? [];
  });
  const settleRecord = async (
    recordId: string,
    outcome: 'success' | 'failure',
    sections?: SectionKey[],
  ) => await page.evaluate(({ id, result, only }) => {
    const control = (window as Window & {
      __detailWorkspaceControl?: {
        settle: (recordId: string, outcome: 'success' | 'failure', sections?: SectionKey[]) => unknown;
      };
    }).__detailWorkspaceControl;
    return control?.settle(id, result, only);
  }, { id: recordId, result: outcome, only: sections });

  const expectPending = async (recordId: string, expected = 4) => {
    await expect.poll(async () => (
      await pendingLoads()
    ).filter(call => call.recordId === recordId).length).toBe(expected);
  };

  const dialog = await openRecordDetail(page, 1);
  await expectPending('1');
  await settleRecord('1', 'success');

  const workspace = dialog.locator('[data-svadmin-detail-workspace]');
  await expect(workspace).toHaveAttribute('data-svadmin-detail-record', '1');
  await expect(page.getByTestId('detail-workspace-relations-content')).toContainText('Related records for 1');
  await expect(section(dialog, 'attachments')).toContainText('attachment-record-1.txt');
  await expect(section(dialog, 'activity')).toContainText('activity for record 1');
  await expect(section(dialog, 'audit')).toContainText('audit for record 1');
  await expect(section(dialog, 'versions')).toContainText('version-old-1');
  await expect(section(dialog, 'versions')).toContainText('version-new-1');
  await saveScreenshot(page, testInfo, 'a-to-b-before-switch');

  // A real fixture-level user control changes the detail route while the drawer
  // stays mounted; background row buttons are covered by the modal overlay.
  await dialog.getByTestId('detail-workspace-switch-next').click();
  await expect(workspace).toHaveAttribute('data-svadmin-detail-record', '2');
  await expect(page.getByTestId('detail-workspace-relations-content')).toContainText('Related records for 2');

  // B is still pending: every A marker must be gone without waiting for A to settle.
  await expect(dialog).not.toContainText('attachment-record-1.txt');
  await expect(dialog).not.toContainText('activity for record 1');
  await expect(dialog).not.toContainText('audit for record 1');
  await expect(dialog).not.toContainText('version-old-1');
  await expect(dialog).not.toContainText('version-new-1');
  await expectPending('2');
  await expect(section(dialog, 'attachments').locator('[data-svadmin-detail-section-loading]')).toBeVisible();
  await saveScreenshot(page, testInfo, 'a-to-b-b-pending');

  await settleRecord('2', 'success');
  await expect(section(dialog, 'attachments')).toContainText('attachment-record-2.txt');
  await expect(section(dialog, 'activity')).toContainText('activity for record 2');
  await expect(section(dialog, 'audit')).toContainText('audit for record 2');
  await expect(section(dialog, 'versions')).toContainText('version-old-2');
  await expect(section(dialog, 'versions')).toContainText('version-new-2');
  await saveScreenshot(page, testInfo, 'a-to-b-b-ready');

  // Start a second A request, move back to B, then let that stale A request
  // resolve and fail after B is already rendered.
  await dialog.getByTestId('detail-workspace-switch-previous').click();
  await expect(workspace).toHaveAttribute('data-svadmin-detail-record', '1');
  await expectPending('1');
  await dialog.getByTestId('detail-workspace-switch-next').click();
  await expect(workspace).toHaveAttribute('data-svadmin-detail-record', '2');
  await expectPending('2');
  await settleRecord('2', 'success');
  await expect(section(dialog, 'attachments')).toContainText('attachment-record-2.txt');

  await settleRecord('1', 'success', ['attachments']);
  await settleRecord('1', 'failure', ['activity', 'audit', 'versions']);
  await expect.poll(async () => (await pendingLoads()).filter(call => call.recordId === '1').length).toBe(0);

  await expect(workspace).toHaveAttribute('data-svadmin-detail-record', '2');
  await expect(section(dialog, 'attachments')).toContainText('attachment-record-2.txt');
  await expect(section(dialog, 'activity')).toContainText('activity for record 2');
  await expect(section(dialog, 'audit')).toContainText('audit for record 2');
  await expect(section(dialog, 'versions')).toContainText('version-old-2');
  await expect(section(dialog, 'versions')).toContainText('version-new-2');
  await expect(dialog).not.toContainText('attachment-record-1.txt');
  await expect(dialog).not.toContainText('activity for record 1');
  await expect(dialog).not.toContainText('audit for record 1');
  await expect(dialog).not.toContainText('version-old-1');
  await expect(dialog.locator('[data-svadmin-detail-section-error]')).toHaveCount(0);
  await expect(dialog).not.toContainText('PRIVATE_DETAIL_WORKSPACE_LATE_FAILURE');
  await saveScreenshot(page, testInfo, 'a-to-b-late-a-ignored');

  // The in-drawer A -> B switches use real pushes, so closing must still close
  // the current B drawer instead of walking back to the stale A detail route.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('[data-svadmin-detail-workspace]')).toHaveCount(0);
  await expect(page.getByTestId('detail-workspace-route-detail')).toHaveText('');

  const detailCalls = await readLog<{ resource: string; id: number | string }>(page, 'detail');
  expect(detailCalls.every(call => call.resource === 'detail-workspace-records')).toBe(true);
  expect(detailCalls.some(call => Number(call.id) === 1)).toBe(true);
  expect(detailCalls.some(call => Number(call.id) === 2)).toBe(true);

  for (const key of ['attachments', 'activity', 'audit', 'versions'] as const) {
    const calls = await readLog<ProviderCall>(page, key);
    expect(calls.length, key).toBeGreaterThanOrEqual(2);
    for (const call of calls) {
      expect(call, key).toEqual(expect.objectContaining({
        resourceName: 'detail-workspace-records',
        recordId: expect.any(Number),
        meta: expect.objectContaining({ recordId: call.recordId }),
      }));
      expect([1, 2]).toContain(Number(call.recordId));
    }
    expect(calls.at(-1), key).toEqual(expect.objectContaining({
      resourceName: 'detail-workspace-records', recordId: 2,
      meta: expect.objectContaining({ recordId: 2 }),
    }));
  }

  await expectNoNarrowOverflow(page, testInfo);
  expect(errors).toEqual([]);
});

test('DetailWorkspace closes A -> B -> A without returning to B', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=detail-workspace');

  const dialog = await openRecordDetail(page, 1);
  const workspace = dialog.locator('[data-svadmin-detail-workspace]');
  await expect(workspace).toHaveAttribute('data-svadmin-detail-record', '1');

  await dialog.getByTestId('detail-workspace-switch-next').click();
  await expect(workspace).toHaveAttribute('data-svadmin-detail-record', '2');
  await dialog.getByTestId('detail-workspace-switch-previous').click();
  await expect(workspace).toHaveAttribute('data-svadmin-detail-record', '1');

  // The current record matches the record that first opened the drawer, but a
  // real detail-route switch did happen. Escape must clear the route instead of
  // walking back to the previous B entry in history.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('[data-svadmin-detail-workspace]')).toHaveCount(0);
  await expect(page.getByTestId('detail-workspace-route-detail')).toHaveText('');

  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'a-to-b-a-escape');
  expect(errors).toEqual([]);
});

test('DetailWorkspace switches provider config and record in one user event: A cleared while B is pending, then B renders record 2', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=detail-workspace&controlled=deferred');

  const dialog = await openRecordDetail(page, 1);
  const workspace = dialog.locator('[data-svadmin-detail-workspace]');
  await expect(workspace).toHaveAttribute('data-svadmin-detail-record', '1');
  await expect(page.getByTestId('detail-workspace-relations-provider')).toHaveText('A');

  await expect.poll(async () => pendingShape(await readPending(page))).toEqual([
    'A:1:activity', 'A:1:attachments', 'A:1:audit', 'A:1:versions',
  ]);
  await settleProvider(page, 'A', '1', 'success');

  await expect(page.getByTestId('detail-workspace-relations-content')).toContainText('Related records for 1');
  await expect(section(dialog, 'attachments')).toContainText('attachment-record-1.txt');
  await expect(section(dialog, 'activity')).toContainText('activity for record 1');
  await expect(section(dialog, 'audit')).toContainText('audit for record 1');
  await expect(section(dialog, 'versions')).toContainText('version-old-1');
  await expectProviderScopes(page, 'A', 1, 1);
  await expectProviderScopes(page, 'B', 2, 0);
  await saveScreenshot(page, testInfo, 'provider-switch-a-ready');

  // The fixture button changes the detail route and the whole provider config
  // object identity in the same event; no private component state is touched.
  await dialog.getByTestId('detail-workspace-switch-provider-next').click();
  await expect(workspace).toHaveAttribute('data-svadmin-detail-record', '2');
  await expect(page.getByTestId('detail-workspace-relations-provider')).toHaveText('B');
  await expect(page.getByTestId('detail-workspace-relations-content')).toContainText('Related records for 2');

  // B is still pending and every A marker must already be gone.
  await expect.poll(async () => pendingShape(await readPending(page))).toEqual([
    'B:2:activity', 'B:2:attachments', 'B:2:audit', 'B:2:versions',
  ]);
  await expect(dialog).not.toContainText('attachment-record-1.txt');
  await expect(dialog).not.toContainText('activity for record 1');
  await expect(dialog).not.toContainText('audit for record 1');
  await expect(dialog).not.toContainText('version-old-1');
  await expect(dialog).not.toContainText('version-new-1');
  await expect(section(dialog, 'attachments').locator('[data-svadmin-detail-section-loading]')).toBeVisible();
  await saveScreenshot(page, testInfo, 'provider-switch-b-pending');

  // Old provider never read record 2, new provider never read record 1.
  await expectProviderScopes(page, 'A', 1, 1);
  await expectProviderScopes(page, 'B', 2, 1);

  await settleProvider(page, 'B', '2', 'success');
  await expect(section(dialog, 'attachments')).toContainText('attachment-record-2-B.txt');
  await expect(section(dialog, 'activity')).toContainText('activity for record 2-B');
  await expect(section(dialog, 'audit')).toContainText('audit for record 2-B');
  await expect(section(dialog, 'versions')).toContainText('version-old-2-B');
  await expect(section(dialog, 'versions')).toContainText('version-new-2-B');
  await expect(dialog).not.toContainText('attachment-record-1.txt');
  await expect(dialog).not.toContainText('version-old-1');
  expect(await readPending(page)).toEqual([]);

  // Exact call counts and full scopes did not change after B settled.
  await expectProviderScopes(page, 'A', 1, 1);
  await expectProviderScopes(page, 'B', 2, 1);
  expect(await page.locator('body').textContent()).not.toContain('PRIVATE_DETAIL_WORKSPACE');
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'provider-switch-b-ready');
  expect(errors).toEqual([]);
});

test('DetailWorkspace keeps B clean when the old A provider is still in flight and later succeeds or fails', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=detail-workspace&controlled=deferred');

  const dialog = await openRecordDetail(page, 1);
  const workspace = dialog.locator('[data-svadmin-detail-workspace]');
  await expect(workspace).toHaveAttribute('data-svadmin-detail-record', '1');
  // A record 1 is still in flight when the provider/record switch happens.
  await expect.poll(async () => pendingShape(await readPending(page))).toEqual([
    'A:1:activity', 'A:1:attachments', 'A:1:audit', 'A:1:versions',
  ]);

  await dialog.getByTestId('detail-workspace-switch-provider-next').click();
  await expect(workspace).toHaveAttribute('data-svadmin-detail-record', '2');
  await expect(page.getByTestId('detail-workspace-relations-provider')).toHaveText('B');
  // The old A graph is still unresolved and must stay distinguishable from B by
  // provider identity plus record id, not by the mutable active label.
  await expect.poll(async () => pendingShape(await readPending(page))).toEqual([
    'A:1:activity', 'A:1:attachments', 'A:1:audit', 'A:1:versions',
    'B:2:activity', 'B:2:attachments', 'B:2:audit', 'B:2:versions',
  ]);

  await settleProvider(page, 'B', '2', 'success');
  await expect(section(dialog, 'attachments')).toContainText('attachment-record-2-B.txt');
  await expect(section(dialog, 'activity')).toContainText('activity for record 2-B');
  await expect(section(dialog, 'audit')).toContainText('audit for record 2-B');
  await expect(section(dialog, 'versions')).toContainText('version-old-2-B');
  await saveScreenshot(page, testInfo, 'late-a-b-ready');

  // The old A graph resolves late: one success and three failures.
  await settleProvider(page, 'A', '1', 'success', ['attachments']);
  await settleProvider(page, 'A', '1', 'failure', ['activity', 'audit', 'versions']);
  await expect.poll(async () => (await readPending(page)).length).toBe(0);

  await expect(workspace).toHaveAttribute('data-svadmin-detail-record', '2');
  await expect(page.getByTestId('detail-workspace-relations-provider')).toHaveText('B');
  await expect(section(dialog, 'attachments')).toContainText('attachment-record-2-B.txt');
  await expect(section(dialog, 'activity')).toContainText('activity for record 2-B');
  await expect(section(dialog, 'audit')).toContainText('audit for record 2-B');
  await expect(section(dialog, 'versions')).toContainText('version-old-2-B');
  await expect(dialog).not.toContainText('attachment-record-1.txt');
  await expect(dialog).not.toContainText('activity for record 1');
  await expect(dialog).not.toContainText('audit for record 1');
  await expect(dialog).not.toContainText('version-old-1');
  await expect(dialog.locator('[data-svadmin-detail-section-error]')).toHaveCount(0);
  await expect(dialog).not.toContainText('PRIVATE_DETAIL_WORKSPACE_LATE_FAILURE');

  await expectProviderScopes(page, 'A', 1, 1);
  await expectProviderScopes(page, 'B', 2, 1);
  expect(await page.locator('body').textContent()).not.toContain('PRIVATE_DETAIL_WORKSPACE');
  await expectNoNarrowOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'late-a-ignored-b-clean');
  expect(errors).toEqual([]);
});
