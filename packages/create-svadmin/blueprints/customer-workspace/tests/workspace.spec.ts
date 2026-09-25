import { test, expect, type Page } from '@playwright/test';
import catalog from '../svadmin.vibe.json' with { type: 'json' };

function visibleText(page: Page, text: string | RegExp) {
  return page.getByText(text, { exact: typeof text === 'string' }).filter({ visible: true });
}

test.beforeEach(async ({ page }) => {
  // 隔离外部字体服务，页面验收仅依赖本地应用和系统备用字体。
  await page.route('https://fonts.bunny.net/**', route => route.abort());
});

test('keyboard skip link does not cover navigation', async ({ page, isMobile }) => {
  await page.goto('/#/customers');
  const skip = page.locator('[data-svadmin-skip-link]');
  await expect(skip).toBeAttached();
  await expect.poll(() => skip.evaluate(el => el.getBoundingClientRect().bottom)).toBeLessThanOrEqual(0);
  await skip.focus();
  await expect.poll(() => skip.evaluate(el => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  if (isMobile) {
    await page.getByRole('button', { name: '菜单', exact: true }).click();
    await expect(page.locator('a[href="#/customers"]').filter({ visible: true })).toBeVisible();
  }
});

for (const entry of catalog.pages) {
  test(`${entry.id} renders without page overflow`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/#${entry.route}`);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('main')).not.toBeEmpty();
    const pageId = {
      list: 'customer-list', detail: 'customer-detail', form: 'customer-form',
      dashboard: 'dashboard', settings: 'workspace_settings', approval: 'approval-review',
    }[entry.id];
    await expect(page.locator(`[data-svadmin-content-page="${pageId}"]`)).toBeVisible();
    if (entry.id === 'detail') await expect(page.getByText('发送实施方案，等待客户确认。')).toBeVisible();
    if (entry.id === 'approval') await expect(page.getByRole('heading', { name: '审批决定' })).toBeVisible();
    if (entry.id === 'list') await expect(visibleText(page, '澄川科技')).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${entry.id}.png`), fullPage: true, animations: 'disabled' });
    expect(errors).toEqual([]);
  });
}

test('customer creation, detail, edit, and validation', async ({ page }) => {
  await page.goto('/#/customers/create');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
  await page.getByLabel('客户名称', { exact: false }).fill('验收客户');
  await page.getByLabel('联系人', { exact: false }).fill('林悦');
  await page.getByLabel('邮箱', { exact: false }).fill('acceptance@example.test');
  await page.getByLabel('负责人', { exact: false }).fill('陈晨');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page).toHaveURL(/#\/customers(?:\?|$)/);
  await expect(visibleText(page, '验收客户')).toBeVisible();
  await page.evaluate(() => { location.hash = '/customers/show/c1'; });
  await expect(page.getByText('发送实施方案，等待客户确认。')).toBeVisible();
  await page.evaluate(() => { location.hash = '/customers/edit/c1'; });
  await page.getByLabel('客户名称', { exact: false }).fill('澄川科技更新');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(visibleText(page, '澄川科技更新')).toBeVisible();
});

test('global design preset changes without losing customer data', async ({ page }) => {
  await page.goto('/#/workspace_settings');
  await page.getByRole('combobox', { name: '设计预设', exact: true }).selectOption('operations');
  await page.evaluate(() => { location.hash = '/customers'; });
  await expect(page.locator('[data-svadmin-content-page="customer-list"]')).toHaveAttribute('data-density', 'compact');
  await expect(visibleText(page, '澄川科技')).toBeVisible();
  await page.evaluate(() => { location.hash = '/workspace_settings'; });
  await page.getByRole('combobox', { name: '设计预设', exact: true }).selectOption('collaboration');
  await page.evaluate(() => { location.hash = '/customers/create'; });
  await expect(page.locator('[data-svadmin-content-page="customer-form"]')).toHaveAttribute('data-svadmin-content-page-width', 'default');
});

for (const preset of catalog.presets) {
  test(`design preset: ${preset}`, async ({ page }, testInfo) => {
    await page.goto('/#/workspace_settings');
    await page.getByRole('combobox', { name: '设计预设', exact: true }).selectOption(preset);
    await page.evaluate(() => { location.hash = '/customers'; });
    await expect(visibleText(page, '澄川科技')).toBeVisible();
    await expect(page.locator('[data-svadmin-content-page="customer-list"]')).toHaveAttribute('data-density', preset === 'operations' ? 'compact' : 'comfortable');
    await page.screenshot({ path: testInfo.outputPath(`${preset}.png`), fullPage: true, animations: 'disabled' });
  });
}

test('approval decision and followup editing persist in the session', async ({ page }) => {
  await page.goto('/#/approvals/show/a1');
  await page.getByRole('combobox', { name: '审批结果', exact: false }).selectOption({ label: '已通过' });
  await page.getByLabel('审批意见', { exact: false }).fill('已核实交付范围，可以通过。');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page).toHaveURL(/#\/approvals(?:\?|$)/);
  await page.evaluate(() => { location.hash = '/approvals/show/a1'; });
  await expect(page.getByLabel('审批意见', { exact: false })).toHaveValue('已核实交付范围，可以通过。');
  await expect(page.getByRole('combobox', { name: '审批结果', exact: false }).locator('option:checked')).toHaveText('已通过');
  await page.evaluate(() => { location.hash = '/followups/edit/f1'; });
  await page.getByLabel('跟进内容', { exact: false }).fill('确认合同与实施时间。');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(visibleText(page, '确认合同与实施时间。')).toBeVisible();
  await page.evaluate(() => { location.hash = '/followups/create'; });
  await page.locator('button#customerId').click();
  await page.getByRole('option', { name: '远山设计事务所', exact: true }).click();
  await page.getByLabel('跟进内容', { exact: false }).fill('完成首次需求访谈。');
  await page.getByLabel('负责人', { exact: false }).fill('李沐');
  await page.getByLabel('跟进日期', { exact: false }).fill('2026-09-24');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(visibleText(page, '完成首次需求访谈。')).toBeVisible();
});

test('read-only access allows detail but refuses edits', async ({ page }) => {
  await page.goto('/?scenario=readonly#/customers/show/c1');
  await expect(page.getByText('澄川科技', { exact: true })).toBeVisible();
  await page.evaluate(() => { location.hash = '/customers/edit/c1'; });
  await expect(page.getByText(/无权|权限|拒绝/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '保存', exact: true })).toHaveCount(0);
});

for (const scenario of ['empty', 'error', 'denied', 'loading', 'partial']) {
  test(`provider state: ${scenario}`, async ({ page }, testInfo) => {
    if (scenario === 'loading') {
      // 在导航前暂停演示延迟，避免慢速加载错过骨架屏。
      await page.clock.install({ time: new Date('2026-09-25T00:00:00Z') });
      await page.clock.pauseAt(new Date('2026-09-25T00:01:00Z'));
    }
    await page.goto(`/?scenario=${scenario}#${scenario === 'partial' ? '/' : '/customers'}`);
    if (scenario === 'loading') {
      await expect(page.locator('[data-slot="skeleton"]').filter({ visible: true }).first()).toBeVisible();
    } else if (scenario === 'partial') {
      await expect(page.getByText('部分数据暂不可用')).toBeVisible();
    } else if (scenario === 'denied') {
      await expect(page.getByText(/无权|权限|拒绝/).first()).toBeVisible();
      await expect(page.getByText('澄川科技', { exact: true })).toHaveCount(0);
    } else if (scenario === 'empty') {
      await expect(page.getByRole('heading', { name: '暂无数据', exact: true })).toBeVisible();
    } else {
      await expect(page.getByText(/失败|不可用|错误/).first()).toBeVisible();
    }
    await page.screenshot({ path: testInfo.outputPath(`${scenario}.png`), fullPage: true, animations: 'disabled' });
    if (scenario === 'loading') {
      await page.clock.runFor(2500);
      await expect(visibleText(page, '澄川科技')).toBeVisible();
      await expect(page.locator('[data-slot="skeleton"]').filter({ visible: true })).toHaveCount(0);
    }
  });
}
