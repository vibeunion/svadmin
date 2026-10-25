import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=segmented-control');
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

function group(page: Page, name: string) {
  return page.getByRole('radiogroup', { name });
}

test('SegmentedControl keeps instance radiogroups isolated', async ({ page }) => {
  const first = group(page, 'Primary view');
  const second = group(page, 'Secondary view');
  await expect(first).toHaveAttribute('role', 'radiogroup');
  await expect(second).toHaveAttribute('aria-label', 'Secondary view');
  const names = await page.getByRole('radiogroup').evaluateAll(
    groups => groups.map(element => element.getAttribute('aria-label')),
  );
  // 这些名称由 fixture 宿主显式提供，不是组件自动生成；验证非空且互不重复。
  expect(names.every(name => typeof name === 'string' && name.trim().length > 0)).toBe(true);
  expect(new Set(names).size).toBe(names.length);
  await expect(first.getByRole('radio')).toHaveCount(4);
  await expect(second.getByRole('radio')).toHaveCount(4);
  expect(await first.locator('[role="radio"][tabindex="0"]').count()).toBe(1);
  expect(await second.locator('[role="radio"][tabindex="0"]').count()).toBe(1);
  await expect(first.getByRole('radio', { name: 'Table' })).toBeChecked();
  await expect(second.getByRole('radio', { name: 'Board' })).toBeChecked();

  await second.getByText('Timeline', { exact: true }).click();
  await expect(page.getByTestId('first-value')).toHaveText('table');
  await expect(page.getByTestId('second-value')).toHaveText('timeline');
  await expect(page.getByTestId('first-changes')).toHaveText('0');
  await expect(page.getByTestId('second-changes')).toHaveText('1');
  await expect(first.getByRole('radio', { name: 'Table' })).toBeChecked();
  await expect(second.getByRole('radio', { name: 'Timeline' })).toBeChecked();

  await first.getByText('Board', { exact: true }).click();
  await expect(page.getByTestId('first-value')).toHaveText('board');
  await expect(page.getByTestId('second-value')).toHaveText('timeline');
  await expect(page.getByTestId('first-changes')).toHaveText('1');
  await expect(page.getByTestId('second-changes')).toHaveText('1');
});

test('SegmentedControl participates in natural Tab and Shift+Tab order', async ({ page }) => {
  const before = page.getByRole('button', { name: 'Before segmented groups' });
  const after = page.getByRole('button', { name: 'After segmented groups' });
  const first = group(page, 'First tab group');
  const second = group(page, 'Second tab group');
  const firstSelected = first.getByRole('radio', { name: 'Keyboard table' });
  const secondSelected = second.getByRole('radio', { name: 'Keyboard board' });

  // 只设置初始起点，其后完全依赖浏览器自然 Tab 顺序，不逐次手动 focus。
  await before.focus();
  await page.keyboard.press('Tab');
  await expect(firstSelected).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(secondSelected).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(after).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(secondSelected).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(firstSelected).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(before).toBeFocused();
  await expect(page.getByTestId('tab-first-changes')).toHaveText('0');
  await expect(page.getByTestId('tab-second-changes')).toHaveText('0');
});

test('SegmentedControl keyboard uses arrows Home End Enter and Space', async ({ page }) => {
  const target = group(page, 'Keyboard view');
  const table = target.getByRole('radio', { name: 'Keyboard table' });
  const board = target.getByRole('radio', { name: 'Keyboard board' });
  const timeline = target.getByRole('radio', { name: 'Keyboard timeline' });

  await table.focus();
  await table.press('Enter');
  await expect(page.getByTestId('keyboard-value')).toHaveText('table');
  await expect(page.getByTestId('keyboard-changes')).toHaveText('1');

  await page.getByRole('button', { name: 'Clear keyboard value' }).click();
  await expect(page.getByTestId('keyboard-value')).toHaveText('unset');
  await board.focus();
  await board.press('Space');
  await expect(page.getByTestId('keyboard-value')).toHaveText('board');
  await expect(page.getByTestId('keyboard-changes')).toHaveText('2');

  await board.press('Home');
  await expect(table).toBeFocused();
  await expect(table).toBeChecked();
  await table.press('End');
  await expect(timeline).toBeFocused();
  await expect(timeline).toBeChecked();
  await timeline.press('ArrowLeft');
  await expect(board).toBeFocused();
  await expect(board).toBeChecked();
  await board.press('ArrowRight');
  await expect(timeline).toBeFocused();
  await expect(timeline).toBeChecked();
  expect(await target.locator('[role="radio"][tabindex="0"]').count()).toBe(1);
  await expect(page.getByTestId('keyboard-changes')).toHaveText('6');
});

test('SegmentedControl does not act on modifier-composed arrow keys', async ({ page }) => {
  const target = group(page, 'Keyboard view');
  const table = target.getByRole('radio', { name: 'Keyboard table' });
  const board = target.getByRole('radio', { name: 'Keyboard board' });

  await target.getByText('Keyboard table', { exact: true }).click();
  await expect(page.getByTestId('keyboard-value')).toHaveText('table');
  await expect(page.getByTestId('keyboard-changes')).toHaveText('1');

  await table.focus();
  for (const chord of ['Control+ArrowDown', 'Alt+ArrowDown', 'Meta+ArrowDown'] as const) {
    await page.keyboard.press(chord);
    await expect(table).toBeFocused();
    await expect(table).toBeChecked();
    await expect(page.getByTestId('keyboard-value')).toHaveText('table');
    await expect(page.getByTestId('keyboard-changes')).toHaveText('1');
  }

  // 组件只对未修饰键保持原导航与选择；不承诺阻止浏览器原生组合键动作。
  await page.keyboard.press('ArrowRight');
  await expect(board).toBeFocused();
  await expect(board).toBeChecked();
  await expect(page.getByTestId('keyboard-value')).toHaveText('board');
  await expect(page.getByTestId('keyboard-changes')).toHaveText('2');
});

test('SegmentedControl parent assignment and clear do not emit onchange until user selection', async ({ page }) => {
  const target = group(page, 'Keyboard view');
  await expect(page.getByTestId('keyboard-value')).toHaveText('unset');
  await expect(page.getByTestId('keyboard-changes')).toHaveText('0');

  await page.getByRole('button', { name: 'Assign keyboard value externally' }).click();
  await expect(page.getByTestId('keyboard-value')).toHaveText('timeline');
  await expect(target.getByRole('radio', { name: 'Keyboard timeline' })).toBeChecked();
  await expect(page.getByTestId('keyboard-changes')).toHaveText('0');

  await page.getByRole('button', { name: 'Clear keyboard value' }).click();
  await expect(page.getByTestId('keyboard-value')).toHaveText('unset');
  expect(await target.getByRole('radio').evaluateAll(
    radios => radios.filter(radio => radio.getAttribute('aria-checked') === 'true').length,
  )).toBe(0);
  await expect(page.getByTestId('keyboard-changes')).toHaveText('0');

  await target.getByText('Keyboard table', { exact: true }).click();
  await expect(page.getByTestId('keyboard-value')).toHaveText('table');
  await expect(page.getByTestId('keyboard-changes')).toHaveText('1');
});

test('SegmentedControl RTL reverses horizontal arrows and skips disabled options', async ({ page }) => {
  const target = group(page, 'RTL view');
  const personal = target.getByRole('radio', { name: 'Personal' });
  const team = target.getByRole('radio', { name: 'Team' });
  const company = target.getByRole('radio', { name: 'Company' });

  await expect(company).toBeChecked();
  await company.focus();
  await company.press('ArrowRight');
  await expect(personal).toBeFocused();
  await expect(personal).toBeChecked();
  await personal.press('ArrowLeft');
  await expect(company).toBeFocused();
  await expect(company).toBeChecked();
  await company.press('ArrowDown');
  await expect(personal).toBeFocused();
  await expect(personal).toBeChecked();
  await personal.press('End');
  await expect(company).toBeFocused();
  await expect(company).toBeChecked();
  await expect(team).not.toBeFocused();
  await company.press('ArrowUp');
  await expect(personal).toBeFocused();
  await expect(personal).toBeChecked();
  await expect(page.getByTestId('rtl-value')).toHaveText('personal');
  await expect(page.getByTestId('rtl-changes')).toHaveText('5');
});

test('SegmentedControl disabled groups and options recover after enabling', async ({ page }) => {
  const target = group(page, 'Disabled view');
  await expect(target).toHaveAttribute('aria-disabled', 'true');
  await expect(target.getByRole('radio', { name: 'Table' })).toBeDisabled();
  await target.getByText('Timeline', { exact: true }).click({ force: true });
  await target.getByText('Calendar', { exact: true }).click({ force: true });
  await expect(page.getByTestId('disabled-value')).toHaveText('board');
  await expect(page.getByTestId('disabled-changes')).toHaveText('0');

  await page.getByRole('button', { name: 'Toggle segmented disabled' }).click();
  await expect(target).not.toHaveAttribute('aria-disabled', 'true');
  await expect(target.getByRole('radio', { name: 'Table' })).toBeEnabled();
  await target.getByText('Timeline', { exact: true }).click();
  await expect(page.getByTestId('disabled-value')).toHaveText('timeline');
  await expect(page.getByTestId('disabled-changes')).toHaveText('1');

  await page.getByRole('button', { name: 'Toggle segmented disabled' }).click();
  await expect(target).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByTestId('disabled-value')).toHaveText('timeline');
  await expect(page.getByTestId('disabled-changes')).toHaveText('1');
});

test('SegmentedControl inherits a disabled fieldset without pointer bypass and recovers via keyboard', async ({ page }) => {
  const target = group(page, 'Fieldset inherited disabled');
  const table = target.getByRole('radio', { name: 'Table' });
  const board = target.getByRole('radio', { name: 'Board' });
  const calendar = target.getByRole('radio', { name: 'Calendar' });
  const timeline = target.getByRole('radio', { name: 'Timeline' });
  const toggle = page.getByRole('button', { name: 'Toggle native fieldset disabled' });

  for (const option of [table, board, calendar, timeline]) {
    await expect(option).toBeDisabled();
  }
  await expect(page.getByTestId('native-fieldset-value')).toHaveText('table');
  await expect(page.getByTestId('native-fieldset-changes')).toHaveText('0');

  // 只验证真实指针可操作性：点击未选中的 Board，若禁用失效则会改值和回调。
  const boardBox = await board.boundingBox();
  if (!boardBox) throw new Error('Missing disabled board bounds');
  await page.mouse.click(boardBox.x + boardBox.width / 2, boardBox.y + boardBox.height / 2);
  await expect(page.getByTestId('native-fieldset-value')).toHaveText('table');
  await expect(page.getByTestId('native-fieldset-changes')).toHaveText('0');
  await expect(table).toBeChecked();
  await expect(board).not.toBeChecked();
  await expect(table).toBeDisabled();

  await toggle.click();
  await expect(table).toBeEnabled();
  await table.focus();
  await page.keyboard.press('ArrowRight');
  await expect(board).toBeFocused();
  await expect(board).toBeChecked();
  await expect(page.getByTestId('native-fieldset-value')).toHaveText('board');
  await expect(page.getByTestId('native-fieldset-changes')).toHaveText('1');
});

test('SegmentedControl preserves controlled values that are disabled or removed', async ({ page }) => {
  const disabledCurrent = group(page, 'Controlled disabled current');
  const removedCurrent = group(page, 'Controlled removed current');

  await expect(page.getByTestId('controlled-disabled-value')).toHaveText('calendar');
  await expect(disabledCurrent.getByRole('radio', { name: 'Calendar' })).toBeChecked();
  await expect(disabledCurrent.getByRole('radio', { name: 'Calendar' })).toBeDisabled();
  expect(await disabledCurrent.locator('[role="radio"][tabindex="0"]').count()).toBe(1);
  await expect(disabledCurrent.getByRole('radio', { name: 'Table' })).toHaveAttribute('tabindex', '0');
  await expect(page.getByTestId('controlled-disabled-changes')).toHaveText('0');
  const table = disabledCurrent.getByRole('radio', { name: 'Table' });
  await table.focus();
  await table.press('Enter');
  await expect(page.getByTestId('controlled-disabled-value')).toHaveText('table');
  await expect(page.getByTestId('controlled-disabled-changes')).toHaveText('1');

  await expect(page.getByTestId('controlled-removed-value')).toHaveText('timeline');
  await page.getByRole('button', { name: 'Remove selected option' }).click();
  await expect(page.getByTestId('controlled-removed-value')).toHaveText('timeline');
  await expect(removedCurrent.getByRole('radio')).toHaveCount(3);
  expect(await removedCurrent.getByRole('radio').evaluateAll(
    radios => radios.filter(radio => radio.getAttribute('aria-checked') === 'true').length,
  )).toBe(0);
  expect(await removedCurrent.locator('[role="radio"][tabindex="0"]').count()).toBe(1);
  await expect(removedCurrent.getByRole('radio', { name: 'Table' })).toHaveAttribute('tabindex', '0');
  await expect(page.getByTestId('controlled-removed-changes')).toHaveText('0');
  const removedTable = removedCurrent.getByRole('radio', { name: 'Table' });
  await removedTable.focus();
  await removedTable.press('Space');
  await expect(page.getByTestId('controlled-removed-value')).toHaveText('table');
  await expect(page.getByTestId('controlled-removed-changes')).toHaveText('1');
});

test('SegmentedControl recovers an option after dynamic disabled toggle', async ({ page }) => {
  const target = group(page, 'Dynamic view');
  const table = target.getByRole('radio', { name: 'Table' });
  const board = target.getByRole('radio', { name: 'Board' });
  const timeline = target.getByRole('radio', { name: 'Timeline' });
  const toggle = page.getByRole('button', { name: 'Toggle board option disabled' });

  await expect(page.getByTestId('dynamic-value')).toHaveText('table');
  await expect(table).toHaveAttribute('tabindex', '0');
  await board.click();
  await expect(page.getByTestId('dynamic-value')).toHaveText('board');
  await expect(page.getByTestId('dynamic-changes')).toHaveText('1');
  await board.click();
  await expect(page.getByTestId('dynamic-changes')).toHaveText('1');

  await toggle.click();
  await expect(page.getByTestId('dynamic-board-disabled')).toHaveText('true');
  await expect(board).toBeDisabled();
  await expect(board).toHaveAttribute('aria-disabled', 'true');
  await expect(board).toHaveAttribute('tabindex', '-1');
  await expect(page.getByTestId('dynamic-value')).toHaveText('board');
  await expect(page.getByTestId('dynamic-changes')).toHaveText('1');
  expect(await target.locator('[role="radio"][tabindex="0"]').count()).toBe(1);

  // 使用真实指针坐标点击 disabled 项，不通过 force 绕过原生可操作性。
  const boardBox = await board.boundingBox();
  if (!boardBox) throw new Error('Missing disabled board bounds');
  await page.mouse.click(boardBox.x + boardBox.width / 2, boardBox.y + boardBox.height / 2);
  await expect(page.getByTestId('dynamic-value')).toHaveText('board');
  await expect(page.getByTestId('dynamic-changes')).toHaveText('1');

  await table.focus();
  await table.press('ArrowRight');
  await expect(timeline).toBeFocused();
  await expect(timeline).toBeChecked();
  await expect(page.getByTestId('dynamic-changes')).toHaveText('2');
  await timeline.press('Home');
  await expect(table).toBeFocused();
  await expect(table).toBeChecked();
  await expect(page.getByTestId('dynamic-changes')).toHaveText('3');
  await table.press('End');
  await expect(timeline).toBeFocused();
  await expect(timeline).toBeChecked();
  await expect(page.getByTestId('dynamic-changes')).toHaveText('4');
  expect(await target.locator('[role="radio"][tabindex="0"]').count()).toBe(1);

  await toggle.click();
  await expect(page.getByTestId('dynamic-board-disabled')).toHaveText('false');
  await expect(board).toBeEnabled();
  await expect(board).not.toHaveAttribute('aria-disabled', 'true');
  expect(await target.locator('[role="radio"][tabindex="0"]').count()).toBe(1);

  await table.focus();
  await table.press('ArrowRight');
  await expect(board).toBeFocused();
  await expect(board).toBeChecked();
  await expect(page.getByTestId('dynamic-value')).toHaveText('board');
  await expect(page.getByTestId('dynamic-changes')).toHaveText('5');
  await board.press('End');
  await expect(timeline).toBeFocused();
  await expect(timeline).toBeChecked();
  await expect(page.getByTestId('dynamic-changes')).toHaveText('6');
  await timeline.press('Home');
  await expect(table).toBeFocused();
  await expect(table).toBeChecked();
  await expect(page.getByTestId('dynamic-changes')).toHaveText('7');
  await table.press('ArrowRight');
  await expect(board).toBeFocused();
  await expect(board).toBeChecked();
  await expect(page.getByTestId('dynamic-changes')).toHaveText('8');
});

test('SegmentedControl form host does not submit from internal buttons', async ({ page }) => {
  const form = page.getByRole('form', { name: 'Segmented form' });
  const target = group(page, 'Form view');
  expect(await target.locator('button').evaluateAll(
    buttons => buttons.every(button => (button as HTMLButtonElement).type === 'button'),
  )).toBe(true);

  await target.getByText('Board', { exact: true }).click();
  await expect(page.getByTestId('form-value')).toHaveText('board');
  await expect(page.getByTestId('form-changes')).toHaveText('1');
  await expect(page.getByTestId('form-submissions')).toHaveText('0');
  await target.getByText('Board', { exact: true }).click();
  await expect(page.getByTestId('form-changes')).toHaveText('1');
  await expect(page.getByTestId('form-submissions')).toHaveText('0');

  const table = target.getByRole('radio', { name: 'Table' });
  const board = target.getByRole('radio', { name: 'Board' });
  await table.focus();
  await table.press('Enter');
  await expect(page.getByTestId('form-value')).toHaveText('table');
  await expect(page.getByTestId('form-changes')).toHaveText('2');
  await expect(page.getByTestId('form-submissions')).toHaveText('0');

  await board.focus();
  await board.press('Space');
  await expect(page.getByTestId('form-value')).toHaveText('board');
  await expect(page.getByTestId('form-changes')).toHaveText('3');
  await expect(page.getByTestId('form-submissions')).toHaveText('0');

  await board.press('End');
  await expect(page.getByTestId('form-value')).toHaveText('timeline');
  await expect(page.getByTestId('form-changes')).toHaveText('4');
  await expect(page.getByTestId('form-submissions')).toHaveText('0');

  await form.getByRole('button', { name: 'Submit segmented form' }).click();
  await expect(page.getByTestId('form-submissions')).toHaveText('1');
  await expect(page.getByTestId('form-value')).toHaveText('timeline');
});

test('SegmentedControl narrow layout has no overflow and keeps focus visible', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.endsWith('-desktop'), '仅验证窄屏布局与焦点可见性');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const target = group(page, 'Lower view');
  const table = target.getByRole('radio', { name: 'Table' });
  await table.focus();
  await table.press('End');
  const timeline = target.getByRole('radio', { name: 'Timeline' });
  await expect(timeline).toBeFocused();
  const box = await timeline.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error('Missing focus bounds');
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('SegmentedControl fixture screenshots', async ({ page }, testInfo) => {
  const directory = resolve(process.cwd(), 'output/playwright/segmented-control-browser-contract-20261022');
  mkdirSync(directory, { recursive: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: resolve(directory, `${testInfo.project.name}.png`), fullPage: true });
});
