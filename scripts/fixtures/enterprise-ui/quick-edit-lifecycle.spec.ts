import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshotDirectory = resolve(process.cwd(), 'output/playwright/quick-edit-lifecycle');

type UpdateCall = {
  resource: string;
  id: number;
  variables: Record<string, unknown>;
  meta: Record<string, unknown>;
};

type UpdateSettlement = {
  recordId: number;
  session: number;
  outcome: 'resolved' | 'rejected';
};

type QuickEdit = {
  drawer: Locator;
  title: Locator;
  save: Locator;
  close: Locator;
  cancel: Locator;
};

async function readJson<T>(page: Page, testId: string, fallback: T): Promise<T> {
  const text = await page.getByTestId(testId).textContent();
  return JSON.parse(text ?? JSON.stringify(fallback)) as T;
}

async function updateCount(page: Page): Promise<number> {
  return (await readJson<UpdateCall[]>(page, 'quick-edit-update-calls', [])).length;
}

// 宿主控件代表带外宿主动作（settle deferred 请求或卸载抽屉）。它们位于 modal
// overlay 之后，因此在测试中触发其真实 DOM click handler，而不是穿透一个刻意
// 阻断背景交互的 overlay 做指针点击。
async function hostAction(page: Page, testId: string): Promise<void> {
  await page.getByTestId(testId).evaluate(element => (element as HTMLElement).click());
}

async function openQuickEdit(page: Page, id: number, expectedTitle: string): Promise<QuickEdit> {
  // AutoTable 会同时保留桌面表格和窄屏卡片两套 DOM，因此绑定到可见的行操作实例。
  await page.getByTestId(`open-quick-edit-${id}`).filter({ visible: true }).first().click();
  const drawer = page.getByRole('dialog', { name: /(Edit|编辑)\s*Lifecycle records/ });
  await expect(drawer).toBeVisible();
  const title = drawer.getByRole('textbox', { name: /^(Title|标题)$/ });
  await expect(title).toHaveValue(expectedTitle);
  return {
    drawer,
    title,
    save: drawer.getByRole('button', { name: /^(Save|保存)$/ }),
    close: drawer.getByRole('button', { name: /^(Close|关闭)$/ }),
    cancel: drawer.getByRole('button', { name: /^(Cancel|取消)$/ }),
  };
}

async function expectNoHorizontalOverflow(page: Page, testInfo: TestInfo): Promise<void> {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(metrics.scrollWidth, `${testInfo.project.name} document overflow`).toBeLessThanOrEqual(metrics.innerWidth);
  const panel = page.locator('.svadmin-sheet-panel');
  const box = await panel.count() > 0 && await panel.isVisible() ? await panel.boundingBox() : null;
  if (box) {
    expect(box.x, `${testInfo.project.name} drawer left edge`).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width, `${testInfo.project.name} drawer right edge`)
      .toBeLessThanOrEqual(metrics.innerWidth + 1);
  }
}

async function saveScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: resolve(screenshotDirectory, `${testInfo.project.name}-${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
}

test('QuickEditLifecycle keeps a pending update open across Close, Escape, overlay and Cancel, then closes once after resolve', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=quick-edit-lifecycle');
  await expect(page.getByTestId('quick-edit-lifecycle-fixture')).toBeVisible();

  const quickEdit = await openQuickEdit(page, 1, 'Lifecycle item 1');
  await quickEdit.title.fill('pending lifecycle draft');
  await quickEdit.save.click();
  await expect.poll(() => updateCount(page)).toBe(1);
  await expect(quickEdit.save).toBeDisabled();

  await quickEdit.close.click();
  await expect(quickEdit.drawer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(quickEdit.drawer).toBeVisible();
  // 窄屏 sheet 占满宽度，没有只属于 overlay 的视口坐标。这里派发真实的 overlay
  // click 事件而不是点击被覆盖的坐标；handler 与关闭请求路径不变。
  await page.locator('.svadmin-sheet-overlay').dispatchEvent('click');
  await expect(quickEdit.drawer).toBeVisible();
  await expect(quickEdit.cancel).toBeVisible();
  await quickEdit.cancel.click();
  await expect(quickEdit.drawer).toBeVisible();

  await expect(quickEdit.title).toHaveValue('pending lifecycle draft');
  await expect(quickEdit.drawer.getByRole('alert')).toHaveCount(0);
  expect(await updateCount(page)).toBe(1);
  expect(await readJson(page, 'quick-edit-host', { openId: null })).toEqual(expect.objectContaining({ openId: 1 }));
  await expectNoHorizontalOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'pending-close-protected');

  await hostAction(page, 'resolve-pending-update');
  await expect(quickEdit.drawer).toBeHidden();
  await expect.poll(async () => {
    const records = await readJson<Array<{ id: number; title: string }>>(page, 'quick-edit-records', []);
    return records.find(record => record.id === 1)?.title;
  }).toBe('pending lifecycle draft');
  expect(await updateCount(page)).toBe(1);
  const updates = await readJson<UpdateCall[]>(page, 'quick-edit-update-calls', []);
  expect(updates[0]).toEqual(expect.objectContaining({
    resource: 'lifecycle-records',
    id: 1,
    variables: { title: 'pending lifecycle draft' },
  }));
  expect(await readJson(page, 'quick-edit-receipts', [])).toEqual([
    { recordId: 1, session: 1, decision: 'applied' },
  ]);
  await expectNoHorizontalOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'pending-resolved');
  expect(errors).toEqual([]);
});

test('QuickEditLifecycle isolates a replacement record from a resolved old update after the host force-closes the drawer', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=quick-edit-lifecycle');
  await expect(page.getByTestId('quick-edit-lifecycle-fixture')).toBeVisible();

  const first = await openQuickEdit(page, 1, 'Lifecycle item 1');
  await first.title.fill('old pending draft');
  await first.save.click();
  await expect.poll(() => updateCount(page)).toBe(1);

  await hostAction(page, 'force-close-drawer');
  await expect(first.drawer).toBeHidden();
  await expect(page.getByTestId('quick-edit-host')).toContainText('"openId":null');

  const replacement = await openQuickEdit(page, 2, 'Lifecycle item 2');
  await replacement.title.fill('replacement draft');
  await expectNoHorizontalOverflow(page, testInfo);

  await hostAction(page, 'resolve-pending-update');
  await expect(replacement.drawer).toBeVisible();
  await expect(replacement.title).toHaveValue('replacement draft');
  await expect(replacement.drawer.getByRole('alert')).toHaveCount(0);
  await expect(page.getByTestId('quick-edit-host')).toContainText('"openId":2');
  await expect.poll(async () => readJson<UpdateSettlement[]>(page, 'quick-edit-update-settlements', [])).toEqual([
    { recordId: 1, session: 1, outcome: 'resolved' },
  ]);
  await expect.poll(async () => readJson<Array<{ id: number; title: string }>>(page, 'quick-edit-records', [])).toEqual([
    { id: 1, title: 'old pending draft', team: 'platform' },
    { id: 2, title: 'Lifecycle item 2', team: 'operations' },
  ]);
  expect(await updateCount(page)).toBe(1);
  expect(await readJson(page, 'quick-edit-receipts', [])).toEqual([]);
  await expect(replacement.title).toHaveValue('replacement draft');
  await expect(replacement.save).toBeEnabled();
  await expectNoHorizontalOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'replacement-after-old-resolve');

  await replacement.close.click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: /^(Confirm|确认)$/ }).click();
  await expect(confirm).toBeHidden();
  await expect(replacement.drawer).toBeHidden();
  const receipts = await readJson<Array<{ recordId: number; session: number; decision: string }>>(page, 'quick-edit-receipts', []);
  expect(receipts).toEqual([{ recordId: 2, session: 2, decision: 'applied' }]);
  await expectNoHorizontalOverflow(page, testInfo);
  expect(errors).toEqual([]);
});

test('QuickEditLifecycle isolates a replacement record from a rejected old update after the host force-closes the drawer', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=quick-edit-lifecycle');
  await expect(page.getByTestId('quick-edit-lifecycle-fixture')).toBeVisible();

  const first = await openQuickEdit(page, 1, 'Lifecycle item 1');
  await first.title.fill('old rejected draft');
  await first.save.click();
  await expect.poll(() => updateCount(page)).toBe(1);

  await hostAction(page, 'force-close-drawer');
  await expect(first.drawer).toBeHidden();

  const replacement = await openQuickEdit(page, 2, 'Lifecycle item 2');
  await replacement.title.fill('replacement survives rejection');
  await expectNoHorizontalOverflow(page, testInfo);

  await hostAction(page, 'reject-pending-update');
  await expect(replacement.drawer).toBeVisible();
  await expect(replacement.title).toHaveValue('replacement survives rejection');
  await expect(replacement.drawer.getByRole('alert')).toHaveCount(0);
  await expect(page.getByTestId('quick-edit-host')).toContainText('"openId":2');
  await expect.poll(async () => readJson<UpdateSettlement[]>(page, 'quick-edit-update-settlements', [])).toEqual([
    { recordId: 1, session: 1, outcome: 'rejected' },
  ]);
  await expect.poll(async () => readJson<Array<{ id: number; title: string }>>(page, 'quick-edit-records', [])).toEqual([
    { id: 1, title: 'Lifecycle item 1', team: 'platform' },
    { id: 2, title: 'Lifecycle item 2', team: 'operations' },
  ]);
  expect(await updateCount(page)).toBe(1);
  expect(await page.locator('body').textContent()).not.toContain('PRIVATE_QUICK_EDIT_UPDATE_DIAGNOSTIC');
  expect(await readJson(page, 'quick-edit-receipts', [])).toEqual([]);
  await expect(replacement.title).toHaveValue('replacement survives rejection');
  await expect(replacement.save).toBeEnabled();
  await expect(replacement.drawer.getByRole('alert')).toHaveCount(0);
  await expectNoHorizontalOverflow(page, testInfo);
  await saveScreenshot(page, testInfo, 'replacement-after-old-reject');

  await replacement.close.click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: /^(Confirm|确认)$/ }).click();
  await expect(confirm).toBeHidden();
  await expect(replacement.drawer).toBeHidden();
  expect(await readJson(page, 'quick-edit-receipts', [])).toEqual([
    { recordId: 2, session: 2, decision: 'applied' },
  ]);
  await expectNoHorizontalOverflow(page, testInfo);
  expect(errors).toEqual([]);
});
