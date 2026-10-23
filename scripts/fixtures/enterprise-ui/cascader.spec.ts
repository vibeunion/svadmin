import { test, expect, type Locator, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?view=cascader');
});

async function settleFocus(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

async function tabUntilFocused(page: Page, target: Locator, maxTabs = 6): Promise<void> {
  for (let attempt = 0; attempt < maxTabs; attempt += 1) {
    if (await target.evaluate(element => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
}

test('Cascader navigates columns with arrows without committing', async ({ page }) => {
  const fixture = page.getByTestId('cascader-fixture');
  const trigger = fixture.getByRole('button', { name: 'Path', exact: true });
  await trigger.press('Enter');
  const parent = page.getByRole('button', { name: 'Parent', exact: true });
  await expect(parent).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await settleFocus(page);
  await expect(page.getByRole('button', { name: 'Child', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await settleFocus(page);
  await expect(page.getByRole('button', { name: 'Grandchild', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await settleFocus(page);
  await expect(page.getByRole('button', { name: 'Child', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await settleFocus(page);
  await expect(page.getByRole('button', { name: 'Parent', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await settleFocus(page);
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  await settleFocus(page);
  await expect(parent).toBeFocused();
  await page.keyboard.press('Escape');
  await settleFocus(page);
  await expect(trigger).toBeFocused();
  await expect(fixture.getByTestId('cascader-changes')).toHaveText('0');
  await expect(fixture.getByTestId('cascader-value')).toHaveText('null');
});

test('Cascader removes stale descendants when a branch becomes a leaf', async ({ page }) => {
  const fixture = page.getByTestId('cascader-fixture');
  const trigger = fixture.getByRole('button', { name: 'Path', exact: true });
  await trigger.click();
  await page.getByRole('button', { name: 'Parent', exact: true }).click();
  await page.getByRole('button', { name: 'Child', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Grandchild', exact: true })).toBeVisible();
  await fixture.getByRole('button', { name: 'Make parent leaf', exact: true }).dispatchEvent('click');
  await expect(page.getByRole('button', { name: 'Grandchild', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Child', exact: true })).toHaveCount(0);
  await expect(fixture.getByTestId('cascader-changes')).toHaveText('0');
  await page.getByRole('button', { name: 'Parent', exact: true }).click();
  await expect(fixture.getByTestId('cascader-value')).toHaveText('["parent"]');
  await expect(fixture.getByTestId('cascader-changes')).toHaveText('1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Cascader async keyboard load shares one request and commits only on explicit Enter', async ({ page }) => {
  await page.goto('/?view=cascader&async=true');
  const fixture = page.getByTestId('cascader-fixture');
  const trigger = fixture.getByRole('button', { name: 'Path', exact: true });
  await trigger.press('Enter');
  const parent = page.getByRole('button', { name: 'Async parent', exact: true });
  await expect(parent).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(fixture.getByTestId('cascader-load-calls')).toHaveText('1');
  await expect(page.locator('div[role="status"]')).toBeVisible();
  await expect(fixture.getByTestId('cascader-changes')).toHaveText('0');
  await expect(fixture.getByTestId('cascader-value')).toHaveText('null');

  // 第二条 Right 仍在同一在途请求上，不得再增加加载次数或提交路径。
  await page.keyboard.press('ArrowRight');
  await expect(fixture.getByTestId('cascader-load-calls')).toHaveText('1');
  await expect(fixture.getByTestId('cascader-changes')).toHaveText('0');

  await fixture.getByTestId('resolve-call-1').dispatchEvent('click');
  const firstChild = page.getByRole('button', { name: 'Loaded first', exact: true });
  await expect(firstChild).toBeVisible();
  await expect(firstChild).toBeFocused();
  await expect(fixture.getByTestId('cascader-changes')).toHaveText('0');
  await expect(fixture.getByTestId('cascader-value')).toHaveText('null');

  await page.keyboard.press('Enter');
  await expect(fixture.getByTestId('cascader-value')).toHaveText('["async-parent","loaded-1"]');
  await expect(fixture.getByTestId('cascader-changes')).toHaveText('1');
  await expect(fixture.getByTestId('cascader-load-calls')).toHaveText('1');
});

test('Cascader async failure hides private error and keyboard retry does not auto commit', async ({ page }) => {
  await page.goto('/?view=cascader&async=true');
  const fixture = page.getByTestId('cascader-fixture');
  await fixture.getByRole('button', { name: 'Path', exact: true }).press('Enter');
  const parent = page.getByRole('button', { name: 'Async parent', exact: true });
  await expect(parent).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(fixture.getByTestId('cascader-load-calls')).toHaveText('1');

  await fixture.getByTestId('reject-call-1').dispatchEvent('click');
  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(/Failed to load child nodes|子节点加载失败/);
  await expect(alert).not.toContainText('PRIVATE_CASCADER_LOAD');
  await expect(fixture.getByTestId('cascader-changes')).toHaveText('0');
  await expect(fixture.getByTestId('cascader-value')).toHaveText('null');

  const retry = page.getByRole('button', { name: /^(Retry|重试)$/ });
  await tabUntilFocused(page, retry);
  await expect(retry).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(fixture.getByTestId('cascader-load-calls')).toHaveText('2');
  await expect(page.locator('div[role="status"]')).toBeVisible();

  await fixture.getByTestId('resolve-call-2').dispatchEvent('click');
  const retriedChild = page.getByRole('button', { name: 'Loaded second', exact: true });
  await expect(retriedChild).toBeVisible();
  await expect(fixture.getByTestId('cascader-changes')).toHaveText('0');
  await expect(fixture.getByTestId('cascader-value')).toHaveText('null');

  await page.keyboard.press('ArrowRight');
  await expect(retriedChild).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(fixture.getByTestId('cascader-value')).toHaveText('["async-parent","loaded-2"]');
  await expect(fixture.getByTestId('cascader-changes')).toHaveText('1');
});

test('Cascader async keyboard Retry focuses the first loaded child', async ({ page }) => {
  await page.goto('/?view=cascader&async=true');
  const fixture = page.getByTestId('cascader-fixture');
  await fixture.getByRole('button', { name: 'Path', exact: true }).press('Enter');
  await expect(page.getByRole('button', { name: 'Async parent', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await fixture.getByTestId('reject-call-1').dispatchEvent('click');
  const retry = page.getByRole('button', { name: /^(Retry|重试)$/ });
  await tabUntilFocused(page, retry);
  await expect(retry).toBeFocused();
  await page.keyboard.press('Enter');
  await fixture.getByTestId('resolve-call-2').dispatchEvent('click');
  await expect(page.getByRole('button', { name: 'Loaded second', exact: true })).toBeFocused();
});

test('Cascader async in-place ancestor disable invalidates a stale response before re-activation', async ({ page }) => {
  await page.goto('/?view=cascader&async=true');
  const fixture = page.getByTestId('cascader-fixture');
  await fixture.getByRole('button', { name: 'Path', exact: true }).press('Enter');
  const parent = page.getByRole('button', { name: 'Async parent', exact: true });
  await expect(parent).toBeFocused();
  await parent.click();
  await expect(fixture.getByTestId('cascader-load-calls')).toHaveText('1');
  await expect(page.locator('div[role="status"]')).toBeVisible();

  await fixture.getByTestId('disable-parent').dispatchEvent('click');
  await expect(parent).toBeDisabled();
  await fixture.getByTestId('enable-parent').dispatchEvent('click');
  await expect(parent).toBeEnabled();
  await expect(fixture.getByTestId('cascader-load-calls')).toHaveText('1');

  // 禁用周期必须作废旧请求；重新启用本身不得自动加载，必须由用户再次激活。
  await expect(page.getByRole('button', { name: 'Loaded first', exact: true })).toHaveCount(0);
  await parent.click();
  await expect(fixture.getByTestId('cascader-load-calls')).toHaveText('2');
  await expect(page.locator('div[role="status"]')).toBeVisible();

  await fixture.getByTestId('resolve-call-2').dispatchEvent('click');
  const freshChild = page.getByRole('button', { name: 'Loaded second', exact: true });
  await expect(freshChild).toBeVisible();

  // 旧请求在重新激活后才完成；它既不能写入子列，也不能覆盖新请求的结果。
  await fixture.getByTestId('resolve-call-1').dispatchEvent('click');
  await expect(page.getByRole('button', { name: 'Loaded first', exact: true })).toHaveCount(0);
  await expect(freshChild).toBeVisible();
  await expect(fixture.getByTestId('cascader-load-calls')).toHaveText('2');
  await expect(fixture.getByTestId('cascader-changes')).toHaveText('0');
  await expect(fixture.getByTestId('cascader-value')).toHaveText('null');
});
