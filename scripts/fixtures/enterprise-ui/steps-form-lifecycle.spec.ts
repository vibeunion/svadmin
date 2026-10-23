import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshotDirectory = resolve(process.cwd(), 'output/playwright/steps-form-lifecycle-20261023');
const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page) ?? []).toEqual([]);
});

function fixture(page: Page): Locator {
  return page.getByTestId('steps-form-lifecycle-fixture');
}

function output(page: Page, name: string): Locator {
  return fixture(page).getByTestId(name);
}

function field(page: Page, name: 'Title' | 'Notes'): Locator {
  return fixture(page).getByRole('textbox', { name: new RegExp(`^${name}`) });
}

function button(page: Page, name: 'Next' | 'Save' | 'Back' | 'Cancel'): Locator {
  return fixture(page).getByRole('button', { name, exact: true });
}

async function open(page: Page): Promise<void> {
  await page.goto('/?view=steps-form-lifecycle');
  await expect(fixture(page).getByRole('button', { name: 'Next', exact: true })).toBeVisible();
  await expect(output(page, 'lifecycle-instance')).toHaveText('0');
}

async function fillFirstStep(page: Page, title: string): Promise<void> {
  await field(page, 'Title').fill(title);
  await button(page, 'Next').click();
  await expect(field(page, 'Notes')).toBeVisible();
}

async function fillConfirmationStep(page: Page, notes: string): Promise<void> {
  await field(page, 'Notes').fill(notes);
}

async function submit(page: Page): Promise<void> {
  await button(page, 'Save').click();
}

async function expectCurrentStep(page: Page, title: 'Basics' | 'Review'): Promise<void> {
  const indicator = stepIndicator(page, title);
  await expect(indicator).toHaveAttribute('aria-current', 'step');
}

// 窄屏会隐藏步骤标题的可见文本，因此用按钮的 textContent 定位指示器，
// 再用 aria-current 断言当前步，不依赖视觉可见的 accessible name。
function stepIndicator(page: Page, title: 'Basics' | 'Review'): Locator {
  return fixture(page).locator('button').filter({ hasText: new RegExp(title) }).first();
}

async function dispatchClick(target: Locator): Promise<void> {
  await target.evaluate(element => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

// 绕过禁用按钮的真实指针可及性，只用于证明事件级守卫仍拒绝第二次写入。
async function forceFormSubmit(page: Page): Promise<void> {
  await fixture(page).locator('form').evaluate(form => {
    const element = form as HTMLFormElement;
    element.requestSubmit();
    element.requestSubmit();
    element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

// 等待目标及其祖先/子树的有限动画结束；infinite、paused 与 idle 动画不会 settle，必须跳过。
async function settleFiniteAnimations(target: Locator): Promise<{ first: string; second: string; waited: number }> {
  return target.evaluate(async element => {
    const chain: Element[] = [];
    for (let node: Element | null = element; node; node = node.parentElement) chain.push(node);
    const animations = new Set([
      ...chain.flatMap(node => node.getAnimations()),
      ...element.getAnimations({ subtree: true }),
    ]);
    const finite = [...animations].filter(animation => {
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

async function capture(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  if (testInfo.project.name.endsWith('narrow')) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  const { first, second } = await settleFiniteAnimations(fixture(page));
  expect(Number.isFinite(Number(first)), `${name}: computed opacity must be numeric`).toBe(true);
  expect(second, `${name}: computed opacity must be stable after finite animations`).toBe(first);
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: resolve(screenshotDirectory, `${testInfo.project.name}-${name}.png`),
    animations: 'disabled',
  });
}

async function expectNoPrivateLeak(page: Page): Promise<void> {
  await expect(fixture(page)).not.toContainText(/PRIVATE_/);
}

test.describe('StepsForm lifecycle', () => {
  test('completes both steps with one success callback, one navigation and exact provider variables', async ({ page }, testInfo) => {
    await open(page);
    await fillFirstStep(page, 'Alpha title');
    await fillConfirmationStep(page, 'Beta notes');
    await expect(output(page, 'lifecycle-writes')).toHaveText('0');
    await submit(page);

    await expect(output(page, 'lifecycle-writes')).toHaveText('1');
    await expect.poll(async () => JSON.parse(await output(page, 'lifecycle-payload').innerText()))
      .toEqual({ title: 'Alpha title', notes: 'Beta notes' });
    await expect(output(page, 'lifecycle-successes')).toHaveText('0');
    await expect(output(page, 'lifecycle-navigation')).toHaveText('1');
    await expect(output(page, 'lifecycle-pending')).toHaveText('none');
    await expect(fixture(page).getByRole('alert')).toHaveCount(0);
    await expectCurrentStep(page, 'Review');
    await capture(page, testInfo, 'completed');
  });

  for (const mode of ['sync', 'async'] as const) {
    test(`keeps the confirmation draft after a ${mode} failure and succeeds on explicit retry`, async ({ page }, testInfo) => {
      await open(page);
      await fillFirstStep(page, `${mode} title`);
      await fillConfirmationStep(page, `${mode} notes`);
      await fixture(page).getByTestId(`set-fail-${mode}`).click();
      await submit(page);

      await expect(output(page, 'lifecycle-writes')).toHaveText('1');
      await expect(fixture(page).getByRole('alert')).toContainText('Operation failed');
      await expectNoPrivateLeak(page);
      await expect(output(page, 'lifecycle-successes')).toHaveText('none');
      await expect(output(page, 'lifecycle-navigation')).toHaveText('0');
      await expectCurrentStep(page, 'Review');
      await expect(field(page, 'Notes')).toHaveValue(`${mode} notes`);
      await expect(button(page, 'Save')).toBeEnabled();
      await capture(page, testInfo, `${mode}-failed`);

      await fixture(page).getByTestId('set-success').click();
      await submit(page);
      await expect(output(page, 'lifecycle-writes')).toHaveText('2');
      await expect.poll(async () => JSON.parse(await output(page, 'lifecycle-payload').innerText()))
        .toEqual({ title: `${mode} title`, notes: `${mode} notes` });
      await expect(output(page, 'lifecycle-successes')).toHaveText('0');
      await expect(output(page, 'lifecycle-navigation')).toHaveText('1');
      await expect(fixture(page).getByRole('alert')).toHaveCount(0);
      await expectCurrentStep(page, 'Review');
      await expect(field(page, 'Notes')).toHaveValue(`${mode} notes`);
      await capture(page, testInfo, `${mode}-retried`);

      await button(page, 'Back').click();
      await expect(field(page, 'Title')).toHaveValue(`${mode} title`);
    });
  }

  test('ignores Back, step navigation, cancel and repeated submit while a write is pending without losing the draft', async ({ page }, testInfo) => {
    await open(page);
    await fillFirstStep(page, 'Pending title');
    await fillConfirmationStep(page, 'Pending notes');
    await fixture(page).getByTestId('set-defer').click();
    await submit(page);

    await expect(output(page, 'lifecycle-pending')).toHaveText('#1');
    await expect(output(page, 'lifecycle-writes')).toHaveText('1');
    await expect(button(page, 'Back')).toBeDisabled();
    await expect(button(page, 'Save')).toBeDisabled();
    await expect(stepIndicator(page, 'Basics')).toBeDisabled();
    // 确认步不是首步，Cancel 在该步不存在；这里同时证明没有可触达的取消入口。
    await expect(button(page, 'Cancel')).toHaveCount(0);

    await dispatchClick(button(page, 'Back'));
    await dispatchClick(stepIndicator(page, 'Basics'));
    await dispatchClick(button(page, 'Save'));
    await forceFormSubmit(page);

    await expect(output(page, 'lifecycle-pending')).toHaveText('#1');
    await expect(output(page, 'lifecycle-writes')).toHaveText('1');
    await expectCurrentStep(page, 'Review');
    await expect(field(page, 'Notes')).toHaveValue('Pending notes');
    await capture(page, testInfo, 'pending-blocked');

    await fixture(page).getByTestId('settle-resolve').click();
    await expect(output(page, 'lifecycle-pending')).toHaveText('none');
    await expect(output(page, 'lifecycle-writes')).toHaveText('1');
    await expect(output(page, 'lifecycle-successes')).toHaveText('0');
    await expect(output(page, 'lifecycle-navigation')).toHaveText('1');
    await expect(fixture(page).getByRole('alert')).toHaveCount(0);

    await button(page, 'Back').click();
    await expect(field(page, 'Title')).toHaveValue('Pending title');
    await button(page, 'Next').click();
    await expect(field(page, 'Notes')).toHaveValue('Pending notes');
    await capture(page, testInfo, 'pending-settled');
  });

  for (const settlement of ['resolve', 'reject'] as const) {
    test(`does not let an old ${settlement} after host replacement pollute the replacement form`, async ({ page }, testInfo) => {
      await open(page);
      await fillFirstStep(page, 'Old title');
      await fillConfirmationStep(page, 'Old notes');
      await fixture(page).getByTestId('set-defer').click();
      await submit(page);
      await expect(output(page, 'lifecycle-pending')).toHaveText('#1');
      await expect(output(page, 'lifecycle-writes')).toHaveText('1');

      await fixture(page).getByTestId('replace-form').click();
      await expect(output(page, 'lifecycle-instance')).toHaveText('1');
      await expect(field(page, 'Title')).toHaveValue('');
      await expect(fixture(page).getByRole('alert')).toHaveCount(0);
      await expect(output(page, 'lifecycle-successes')).toHaveText('none');
      await capture(page, testInfo, `${settlement}-replaced`);

      await fixture(page).getByTestId(`settle-${settlement}`).click();
      await expect(output(page, 'lifecycle-pending')).toHaveText('none');
      await expect(output(page, 'lifecycle-writes')).toHaveText('1');
      await expect(output(page, 'lifecycle-successes')).toHaveText('none');
      await expect(output(page, 'lifecycle-navigation')).toHaveText('0');
      await expect(fixture(page).getByRole('alert')).toHaveCount(0);
      await expect(field(page, 'Title')).toHaveValue('');
      await expectNoPrivateLeak(page);

      await fixture(page).getByTestId('set-success').click();
      await fillFirstStep(page, 'Replacement title');
      await fillConfirmationStep(page, 'Replacement notes');
      await submit(page);

      await expect(output(page, 'lifecycle-writes')).toHaveText('2');
      await expect.poll(async () => JSON.parse(await output(page, 'lifecycle-payload').innerText()))
        .toEqual({ title: 'Replacement title', notes: 'Replacement notes' });
      await expect(output(page, 'lifecycle-successes')).toHaveText('1');
      await expect(output(page, 'lifecycle-navigation')).toHaveText('1');
      await expect(fixture(page).getByRole('alert')).toHaveCount(0);
      await expect(field(page, 'Notes')).toHaveValue('Replacement notes');
      await capture(page, testInfo, `${settlement}-replacement-completed`);
    });
  }
});