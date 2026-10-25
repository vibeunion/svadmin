import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const kinds = ['modal', 'drawer'] as const;
type Kind = (typeof kinds)[number];

const screenshotDirectory = resolve(process.cwd(), 'output/playwright/modal-drawer-form-20261024');

const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page) ?? []).toEqual([]);
});

function panel(page: Page, kind: Kind) {
  return page.locator(kind === 'modal' ? '[data-slot="dialog-content"]' : '[data-slot="sheet"]');
}

function overlay(page: Page, kind: Kind) {
  return page.locator(kind === 'modal' ? '[data-slot="dialog-overlay"]' : '.svadmin-sheet-overlay');
}

function submitButton(page: Page, kind: Kind) {
  return panel(page, kind).getByRole('button', { name: 'Save' });
}

async function openFixture(page: Page, kind: Kind): Promise<void> {
  await page.goto(`/?view=modal-drawer-form&kind=${kind}`);
  await expect(page.getByTestId('fixture-kind')).toHaveText(kind);
}

// 宿主控制面在模态层打开时被遮挡，因此用真实 DOM click 事件触达宿主按钮。
// 这些按钮只改宿主状态（open / isSubmitting / 下次提交结局 / deferred 结算），不读写组件私有状态。
async function hostClick(page: Page, testId: string): Promise<void> {
  await page.getByTestId(testId).dispatchEvent('click');
}

// 让 deferred 结算后的微任务/宏任务完成，避免用动画等待代替状态判定。
async function clickOverlay(page: Page, kind: Kind): Promise<void> {
  if (kind === 'drawer') {
    const box = await panel(page, kind).boundingBox();
    const viewport = page.viewportSize();
    // 桌面抽屉面板只占右侧，左侧留有真实 overlay 区域，用真实指针点击面板外。
    if (box && viewport && box.x >= 16) {
      await page.mouse.click(Math.floor(box.x / 2), Math.floor(viewport.height / 2));
      return;
    }
    // 边界：窄屏抽屉面板铺满视口，不存在真实指针可达的面板外区域，只能对同一 overlay 处理器派发 DOM click。
    await overlay(page, kind).dispatchEvent('click');
    return;
  }
  // Dialog 的关闭由 bits-ui 的 pointerdown-outside 判定，单发 click 事件不会触发；这里用真实指针点击内容外的 overlay 区域。
  await page.mouse.click(4, 4);
}

async function flushSettlements(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>(done => { setTimeout(done, 25); }));
}

// 等待 panel 及其祖先上的有限动画结束；infinite 动画没有 finished，必须跳过。
// paused/idle 动画的 finished 也不会 settle，因此只等待 running/pending/finished 的有限动画。
async function settleFiniteAnimations(target: Locator): Promise<{ first: string; second: string; waited: number }> {
  return target.evaluate(async element => {
    const chain: Element[] = [];
    for (let node: Element | null = element; node; node = node.parentElement) chain.push(node);
    const animations = chain.flatMap(node => node.getAnimations());
    const finite = animations.filter(animation => {
      const timing = animation.effect?.getTiming();
      const duration = timing?.duration;
      if (timing?.iterations === Infinity) return false;
      if (typeof duration !== 'number' || !Number.isFinite(duration)) return false;
      return animation.playState === 'running' || animation.playState === 'pending' || animation.playState === 'finished';
    });
    await Promise.all(finite.map(animation => animation.finished.catch(() => undefined)));
    const read = () => getComputedStyle(element).opacity;
    const first = read();
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const second = read();
    return { first, second, waited: finite.length };
  });
}

async function capture(page: Page, testInfo: TestInfo, kind: Kind, name: string): Promise<void> {
  if (testInfo.project.name.endsWith('narrow')) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  const target = panel(page, kind);
  if (await target.count() > 0) {
    const { first, second } = await settleFiniteAnimations(target);
    expect(Number.isFinite(Number(first)), `${kind}/${name}: computed opacity must be numeric`).toBe(true);
    expect(second, `${kind}/${name}: computed opacity must be stable after finite animations`).toBe(first);
  }
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: resolve(screenshotDirectory, `${testInfo.project.name}-${kind}-${name}.png`),
    animations: 'disabled',
  });
}

async function expectNoPrivateLeak(page: Page, kind: Kind): Promise<void> {
  // 宿主异常带唯一 PRIVATE_* 标记，但组件只能展示通用失败文案，不得把宿主异常文本泄漏到 panel/body。
  await expect(panel(page, kind)).not.toContainText(/PRIVATE_/);
  await expect(page.locator('body')).not.toContainText(/PRIVATE_/);
}

async function expectBlockedCloseAttempts(
  page: Page,
  kind: Kind,
  testInfo: TestInfo,
  phase: string,
): Promise<void> {
  const target = panel(page, kind);
  await expect(submitButton(page, kind)).toBeDisabled();
  await expect(target).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(target).toBeVisible();

  await clickOverlay(page, kind);
  await expect(target).toBeVisible();

  await target.getByRole('button', { name: 'Close' }).click();
  await expect(target).toBeVisible();

  // Cancel 在 busy 时禁用；派发 click 验证组件自身的 busy 守卫，而不是依赖禁用属性。
  await target.getByRole('button', { name: 'Cancel' }).dispatchEvent('click');
  await expect(target).toBeVisible();

  await expect(page.getByTestId('host-cancels')).toHaveText('0');
  await expect(page.getByTestId('host-open')).toHaveText('open');
  await capture(page, testInfo, kind, `${phase}-blocked`);
}

for (const kind of kinds) {
  test(`rejected submits keep the draft and an explicit retry closes (${kind})`, async ({ page }, testInfo) => {
    await openFixture(page, kind);
    const target = panel(page, kind);
    const input = page.getByTestId('draft-input');
    const submit = submitButton(page, kind);

    await hostClick(page, 'open-form');
    await expect(target).toBeVisible();
    await expect(target.getByRole('heading', { name: 'Renewal form' })).toBeVisible();

    await input.fill('Quarterly renewal note 42');
    await hostClick(page, 'outcome-reject-sync');
    await submit.click();
    await expect(target.getByRole('alert')).toContainText(/Operation failed|操作失败/);
    await expect(target).toBeVisible();
    await expect(input).toHaveValue('Quarterly renewal note 42');
    await expect(page.getByTestId('host-submits')).toHaveText('1');
    await expect(page.getByTestId('host-open')).toHaveText('open');
    await expect(page.getByTestId('host-cancels')).toHaveText('0');
    await expect(page.getByTestId('host-drafts')).toContainText('Quarterly renewal note 42');
    await expectNoPrivateLeak(page, kind);
    await capture(page, testInfo, kind, 'reject-sync-feedback');

    await hostClick(page, 'outcome-reject-async');
    await submit.click();
    await expect(page.getByTestId('host-submits')).toHaveText('2');
    await flushSettlements(page);
    await expect(target.getByRole('alert')).toContainText(/Operation failed|操作失败/);
    await expect(target).toBeVisible();
    await expect(input).toHaveValue('Quarterly renewal note 42');
    await expect(page.getByTestId('host-open')).toHaveText('open');
    await expectNoPrivateLeak(page, kind);
    await capture(page, testInfo, kind, 'reject-async-feedback');

    await hostClick(page, 'outcome-resolve');
    await input.fill('Quarterly renewal note 43');
    await submit.click();
    await expect(target).toHaveCount(0);
    await expect(page.getByTestId('host-open')).toHaveText('closed');
    await expect(page.getByTestId('host-submits')).toHaveText('3');
    await expect(page.getByTestId('host-cancels')).toHaveText('0');
    await expect(page.getByTestId('host-drafts')).toContainText('Quarterly renewal note 43');
    await capture(page, testInfo, kind, 'retry-resolved-closed');
  });
}

for (const kind of kinds) {
  test(`busy Close Escape overlay and Cancel are inert, idle ones close (${kind})`, async ({ page }, testInfo) => {
    await openFixture(page, kind);
    const target = panel(page, kind);
    const submit = submitButton(page, kind);
    const cancel = target.getByRole('button', { name: 'Cancel' });
    const closeButton = target.getByRole('button', { name: 'Close' });

    await hostClick(page, 'open-form');
    await expect(target).toBeVisible();
    await hostClick(page, 'outcome-defer');
    await page.getByTestId('draft-input').fill('Pending local draft');
    await submit.click();
    await expect(page.getByTestId('host-pending')).toHaveText('1');
    await expectBlockedCloseAttempts(page, kind, testInfo, 'local-pending');
    await hostClick(page, 'resolve-oldest');
    await expect(target).toHaveCount(0);
    await expect(page.getByTestId('host-cancels')).toHaveText('0');

    await hostClick(page, 'open-form');
    await expect(target).toBeVisible();
    await hostClick(page, 'toggle-external-submitting');
    await expect(page.getByTestId('toggle-external-submitting')).toHaveAttribute('aria-pressed', 'true');
    await expect(submit).toBeDisabled();
    await expectBlockedCloseAttempts(page, kind, testInfo, 'external-submitting');
    await hostClick(page, 'toggle-external-submitting');
    await expect(page.getByTestId('toggle-external-submitting')).toHaveAttribute('aria-pressed', 'false');
    await expect(submit).toBeEnabled();
    await expect(target).toBeVisible();

    const idleActions: Array<{ name: string; run: () => Promise<void> }> = [
      { name: 'escape', run: async () => { await page.keyboard.press('Escape'); } },
      { name: 'overlay', run: async () => { await clickOverlay(page, kind); } },
      { name: 'close', run: async () => { await closeButton.click(); } },
      {
        name: 'cancel',
        run: async () => {
          const before = Number(await page.getByTestId('host-cancels').textContent());
          await cancel.click();
          await expect(page.getByTestId('host-cancels')).toHaveText(String(before + 1));
        },
      },
    ];

    for (const action of idleActions) {
      await hostClick(page, 'open-form');
      await expect(target).toBeVisible();
      await expect(submit).toBeEnabled();
      await action.run();
      await expect(target).toHaveCount(0);
      await expect(page.getByTestId('host-open')).toHaveText('closed');
      await capture(page, testInfo, kind, `idle-${action.name}-closes`);
    }
  });
}

for (const kind of kinds) {
  test(`forced close and reopen isolates stale settlements (${kind})`, async ({ page }, testInfo) => {
    await openFixture(page, kind);
    const target = panel(page, kind);
    const submit = submitButton(page, kind);
    const input = page.getByTestId('draft-input');

    await hostClick(page, 'open-form');
    await expect(target).toBeVisible();
    await input.fill('First draft');
    await hostClick(page, 'outcome-defer');
    await submit.click();
    await expect(submit).toBeDisabled();
    await expect(page.getByTestId('host-pending')).toHaveText('1');
    await hostClick(page, 'force-close');
    await expect(target).toHaveCount(0);
    await expect(page.getByTestId('host-open')).toHaveText('closed');

    await hostClick(page, 'open-form');
    await expect(target).toBeVisible();
    await expect(target.getByRole('alert')).toHaveCount(0);
    await expect(submit).toBeEnabled();
    await expect(input).toHaveValue('First draft');

    await input.fill('Second draft');
    await submit.click();
    await expect(submit).toBeDisabled();
    await expect(page.getByTestId('host-pending')).toHaveText('2');

    // 旧的 pending 成功结算不得关闭新请求，也不得清掉新请求的 loading。
    await hostClick(page, 'resolve-oldest');
    await flushSettlements(page);
    await expect(target).toBeVisible();
    await expect(submit).toBeDisabled();
    await expect(target.getByRole('alert')).toHaveCount(0);
    await expect(page.getByTestId('host-open')).toHaveText('open');
    await expect(page.getByTestId('host-pending')).toHaveText('1');
    await capture(page, testInfo, kind, 'stale-success-ignored');

    await hostClick(page, 'resolve-newest');
    await expect(target).toHaveCount(0);
    await expect(page.getByTestId('host-open')).toHaveText('closed');
    await expect(page.getByTestId('host-pending')).toHaveText('0');

    // 旧的 pending 失败结算不得在新请求上冒出 error。
    await hostClick(page, 'open-form');
    await expect(target).toBeVisible();
    await input.fill('Third draft');
    await submit.click();
    await expect(page.getByTestId('host-pending')).toHaveText('1');
    await hostClick(page, 'force-close');
    await expect(target).toHaveCount(0);

    await hostClick(page, 'open-form');
    await expect(target).toBeVisible();
    await input.fill('Fourth draft');
    await submit.click();
    await expect(submit).toBeDisabled();
    await expect(page.getByTestId('host-pending')).toHaveText('2');
    await hostClick(page, 'reject-oldest');
    await flushSettlements(page);
    await expect(target).toBeVisible();
    await expect(submit).toBeDisabled();
    await expect(target.getByRole('alert')).toHaveCount(0);
    await expect(page.getByTestId('host-open')).toHaveText('open');
    await expect(page.getByTestId('host-pending')).toHaveText('1');
    await expectNoPrivateLeak(page, kind);
    await capture(page, testInfo, kind, 'stale-failure-ignored');

    await hostClick(page, 'resolve-newest');
    await expect(target).toHaveCount(0);
    await expect(page.getByTestId('host-open')).toHaveText('closed');
    await expect(page.getByTestId('host-pending')).toHaveText('0');

    await hostClick(page, 'open-form');
    await expect(target).toBeVisible();
    await expect(target.getByRole('alert')).toHaveCount(0);
    await expect(submit).toBeEnabled();
    await expect(page.getByTestId('host-submits')).toHaveText('4');
    await capture(page, testInfo, kind, 'reopened-clean');
  });
}