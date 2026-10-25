import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?view=tree-select');
});

test('TreeSelect keeps tree keyboard navigation and multiple selection semantics', async ({ page }) => {
  const fixture = page.getByTestId('tree-select-fixture');
  const trigger = fixture.getByRole('button', { name: 'Departments', exact: true });
  await trigger.press('Enter');

  const engineering = page.getByRole('treeitem', { name: 'Engineering' });
  const frontend = page.getByRole('treeitem', { name: 'Frontend' });
  const backend = page.getByRole('treeitem', { name: 'Backend' });
  const tree = page.getByRole('tree');
  await expect(tree).toHaveAttribute('aria-label', 'Departments');
  await expect(tree.locator('[role="treeitem"][tabindex="0"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Engineering: Expand or collapse children' })).toHaveAttribute('tabindex', '-1');
  await expect(engineering).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(frontend).toBeFocused();
  await expect(engineering).toHaveAttribute('tabindex', '-1');
  await expect(frontend).toHaveAttribute('tabindex', '0');
  await page.keyboard.press('ArrowDown');
  await expect(backend).toBeFocused();
  await page.keyboard.press('Space');
  await expect(backend).toHaveAttribute('aria-checked', 'true');
  await expect(fixture.getByTestId('tree-value')).toHaveText('["backend"]');
  await expect(fixture.getByTestId('tree-changes')).toHaveText('1');
  await expect(backend).toBeFocused();

  await page.keyboard.press('ArrowUp');
  await expect(frontend).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(engineering).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(frontend).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(engineering).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(engineering).toHaveAttribute('aria-expanded', 'false');
  await expect(frontend).toHaveCount(0);
  await expect(fixture.getByTestId('tree-changes')).toHaveText('1');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(engineering).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('TreeSelect reports async branch loading and commits only resolved leaves', async ({ page }) => {
  const fixture = page.getByTestId('tree-select-fixture');
  const trigger = fixture.getByRole('button', { name: 'Departments', exact: true });
  await trigger.press('Enter');

  const sales = page.getByRole('treeitem', { name: 'Sales' });
  await expect(page.getByRole('treeitem', { name: 'Engineering' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(sales).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(sales).toHaveAttribute('aria-busy', 'true');
  await expect(fixture.getByTestId('tree-load-calls')).toHaveText('1');
  await expect(page.getByRole('treeitem', { name: 'Enterprise' })).toHaveCount(0);

  // 宿主回执不模拟面板外用户点击，也不改变组件当前焦点。
  await fixture.getByTestId('resolve-sales').dispatchEvent('click');
  const enterprise = page.getByRole('treeitem', { name: 'Enterprise' });
  await expect(enterprise).toBeVisible();
  await expect(sales).toHaveAttribute('aria-busy', 'false');
  await expect(sales).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(enterprise).toBeFocused();
  await page.keyboard.press('Space');
  await expect(fixture.getByTestId('tree-value')).toHaveText('["enterprise"]');
  await expect(fixture.getByTestId('tree-changes')).toHaveText('1');
  await expect(page.getByRole('treeitem', { name: 'Sales' })).toHaveAttribute('aria-checked', 'mixed');
});

test('TreeSelect shares a pending expansion with keyboard cascade selection', async ({ page }) => {
  const fixture = page.getByTestId('tree-select-fixture');
  await fixture.getByRole('button', { name: 'Departments', exact: true }).press('Enter');
  await expect(page.getByRole('treeitem', { name: 'Engineering' })).toBeFocused();
  await page.keyboard.press('End');
  const sales = page.getByRole('treeitem', { name: 'Sales' });
  await expect(sales).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(sales).toHaveAttribute('aria-busy', 'true');
  await page.keyboard.press('Space');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(fixture.getByTestId('tree-changes')).toHaveText('0');
  await expect(fixture.getByTestId('tree-load-calls')).toHaveText('1');
  await fixture.getByTestId('resolve-sales').dispatchEvent('click');
  await expect(fixture.getByTestId('tree-value')).toHaveText('["enterprise","mid-market"]');
  await expect(fixture.getByTestId('tree-changes')).toHaveText('1');
  await expect(sales).toBeFocused();
  await expect(sales).toHaveAttribute('aria-checked', 'true');
});

test('TreeSelect opens search and loads a matching lazy branch from the keyboard', async ({ page }) => {
  await page.goto('/?view=tree-select&searchable=true');
  const fixture = page.getByTestId('tree-select-fixture');
  const trigger = fixture.getByRole('button', { name: 'Departments', exact: true });
  await trigger.press('Enter');
  const search = page.getByRole('textbox');
  await expect(search).toBeFocused();
  await expect(search).toHaveAttribute('aria-controls', await page.getByRole('tree').getAttribute('id') ?? '');
  await page.keyboard.type('Sales');
  await page.keyboard.press('ArrowDown');
  const sales = page.getByRole('treeitem', { name: 'Sales' });
  await expect(sales).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(sales).toHaveAttribute('aria-busy', 'true');
  await expect(fixture.getByTestId('tree-load-calls')).toHaveText('1');
  await fixture.getByTestId('resolve-sales').dispatchEvent('click');
  await expect(sales).toHaveAttribute('aria-busy', 'false');
  await expect(sales).toBeFocused();
  await expect(fixture.getByTestId('tree-changes')).toHaveText('0');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('TreeSelect tolerates host unmount during initial focus without page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=tree-select&unmount=true');
  await page.getByRole('button', { name: 'Departments', exact: true }).press('Enter');
  await expect(page.getByTestId('tree-select')).toHaveCount(0);
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  expect(errors).toEqual([]);
});

test('TreeSelect has one tree Tab stop and returns to the active item after search', async ({ page }) => {
  await page.goto('/?view=tree-select&searchable=true');
  await page.getByRole('button', { name: 'Departments', exact: true }).press('Enter');
  const search = page.getByRole('textbox', { name: 'Search' });
  await expect(search).toBeFocused();
  await page.keyboard.press('Tab');
  const root = page.getByRole('treeitem', { name: 'Engineering', exact: true });
  await expect(root).toBeFocused();
  const groupId = await root.getAttribute('aria-owns');
  expect(groupId).toBeTruthy();
  expect(await root.evaluate(node => {
    const group = document.getElementById(node.getAttribute('aria-owns') ?? '');
    return group?.getAttribute('role') === 'group' && group.querySelectorAll('[role="treeitem"]').length === 2;
  })).toBe(true);
  await page.keyboard.press('ArrowDown');
  const child = page.getByRole('treeitem', { name: 'Frontend', exact: true });
  await expect(child).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(search).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(child).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(search).toBeFocused();
  await search.fill('Sales');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('treeitem', { name: 'Sales', exact: true })).toBeFocused();
  await expect(page.locator('[role="treeitem"][tabindex="0"]')).toHaveCount(1);
});

test('TreeSelect crosses virtual windows with End Home and retains a Tab entry', async ({ page }) => {
  await page.goto('/?view=tree-select&searchable=true&virtual=true');
  await page.getByRole('button', { name: 'Departments', exact: true }).press('Enter');
  const search = page.getByRole('textbox', { name: 'Search' });
  await expect(search).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('treeitem', { name: 'Department 0', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  const last = page.getByRole('treeitem', { name: 'Department 249', exact: true });
  await expect(last).toBeFocused();
  await expect(page.locator('[role="treeitem"][tabindex="0"]')).toHaveCount(1);
  expect(await page.getByRole('treeitem').count()).toBeLessThan(20);
  await page.keyboard.press('Shift+Tab');
  await expect(search).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(last).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.getByRole('treeitem', { name: 'Department 0', exact: true })).toBeFocused();
  await expect(page.locator('[role="treeitem"][tabindex="0"]')).toHaveCount(1);
});

test('TreeSelect retries failed expansion from the focused tree item', async ({ page }) => {
  await page.getByRole('button', { name: 'Departments', exact: true }).press('Enter');
  await expect(page.getByRole('treeitem', { name: 'Engineering', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  const sales = page.getByRole('treeitem', { name: 'Sales', exact: true });
  await expect(sales).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(sales).toHaveAttribute('aria-busy', 'true');
  await page.getByTestId('reject-sales').dispatchEvent('click');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(sales).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByTestId('tree-load-calls')).toHaveText('2');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await page.getByTestId('resolve-sales').dispatchEvent('click');
  await expect(page.getByRole('treeitem', { name: 'Enterprise', exact: true })).toBeVisible();
  await expect(sales).toBeFocused();
  await expect(page.getByTestId('tree-changes')).toHaveText('0');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('treeitem', { name: 'Enterprise', exact: true })).toBeFocused();
});

test('TreeSelect hands pointer expand and retry focus back to keyboard navigation', async ({ page }) => {
  await page.getByRole('button', { name: 'Departments', exact: true }).click();
  await page.getByRole('button', { name: 'Engineering: Expand or collapse children' }).click();
  const root = page.getByRole('treeitem', { name: 'Engineering', exact: true });
  await expect(root).toBeFocused();
  await expect(root).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('ArrowRight');
  await expect(root).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('treeitem', { name: 'Frontend', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Sales: Expand or collapse children' }).click();
  const sales = page.getByRole('treeitem', { name: 'Sales', exact: true });
  await expect(sales).toBeFocused();
  await page.getByTestId('reject-sales').dispatchEvent('click');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Sales: Retry' }).click();
  await expect(sales).toBeFocused();
  await page.keyboard.press('Space');
  await page.getByTestId('resolve-sales').dispatchEvent('click');
  await expect(page.getByRole('treeitem', { name: 'Enterprise', exact: true })).toBeVisible();
  await expect(page.getByTestId('tree-changes')).toHaveText('0');
  await expect(page.getByTestId('tree-load-calls')).toHaveText('2');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('treeitem', { name: 'Enterprise', exact: true })).toBeFocused();
});

for (const action of ['remove', 'clear'] as const) {
  test(`TreeSelect returns focus after keyboard ${action} without reopening`, async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Departments', exact: true });
    await trigger.press('Enter');
    await expect(page.getByRole('treeitem', { name: 'Engineering', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    await expect(page.getByTestId('tree-value')).toHaveText('["frontend"]');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Remove Frontend', exact: true })).toBeFocused();
    if (action === 'clear') {
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Clear selection', exact: true })).toBeFocused();
    }
    await page.keyboard.press(action === 'clear' ? 'Space' : 'Enter');
    await expect(page.getByTestId('tree-value')).toHaveText('[]');
    await expect(page.getByTestId('tree-changes')).toHaveText('2');
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
}

test('TreeSelect preserves outside input and another instance focus after dismissal', async ({ page }) => {
  await page.goto('/?view=tree-select&focus=true');
  const first = page.getByRole('button', { name: 'Departments', exact: true });
  const other = page.getByRole('button', { name: 'Other departments', exact: true });
  const note = page.getByRole('textbox', { name: 'Department note' });
  await first.click();
  await expect(page.getByRole('treeitem', { name: 'Engineering', exact: true })).toBeFocused();
  await note.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.type('outside');
  await expect(note).toHaveValue('outside');
  await expect(note).toBeFocused();
  await first.click();
  await expect(page.getByRole('treeitem', { name: 'Engineering', exact: true })).toBeFocused();
  await other.click();
  await expect(first).toHaveAttribute('aria-expanded', 'false');
  await expect(other).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  const otherSearch = page.getByRole('textbox', { name: 'Search...', exact: true });
  await expect(otherSearch).toBeFocused();
  await page.keyboard.type('Backend');
  await expect(otherSearch).toHaveValue('Backend');
  await page.keyboard.press('Escape');
  await expect(other).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const single of [false, true]) {
test(`TreeSelect leaf-only mode never commits parents and handles lazy leaves (single=${single})`, async ({ page }) => {
  await page.goto(`/?view=tree-select&onlyLeaf=true&searchable=true&single=${single}`);
  const trigger = page.getByRole('button', { name: 'Departments', exact: true });
  await trigger.press('Enter');
  const search = page.getByRole('textbox', { name: 'Search...', exact: true });
  await expect(search).toBeFocused();
  await page.keyboard.press('ArrowDown');
  const engineering = page.getByRole('treeitem', { name: 'Engineering', exact: true });
  await expect(engineering).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('tree-changes')).toHaveText('0');
  await expect(engineering).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('ArrowRight');
  await expect(engineering).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowRight');
  const frontend = page.getByRole('treeitem', { name: 'Frontend', exact: true });
  await expect(frontend).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('tree-value')).toHaveText(single ? '"frontend"' : '["frontend"]');
  await expect(page.getByTestId('tree-changes')).toHaveText('1');
  if (single) {
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(search).toBeFocused();
  } else {
    await page.keyboard.press('Shift+Tab');
    await expect(search).toBeFocused();
  }
  await page.keyboard.type('Sales');
  await page.keyboard.press('ArrowDown');
  const sales = page.getByRole('treeitem', { name: 'Sales', exact: true });
  await expect(sales).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(sales).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByTestId('tree-changes')).toHaveText('1');
  await page.getByTestId('resolve-sales').dispatchEvent('click');
  await expect(sales).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByTestId('tree-changes')).toHaveText('1');
  await page.keyboard.press('Shift+Tab');
  await expect(search).toBeFocused();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('End');
  await expect(sales).toBeFocused();
  await expect(sales).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('ArrowRight');
  await expect(sales).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('tree-changes')).toHaveText('1');
  await page.keyboard.press('End');
  await expect(page.getByRole('treeitem', { name: 'Mid-market', exact: true })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('tree-value')).toHaveText(single ? '"mid-market"' : '["frontend","mid-market"]');
  await expect(page.getByTestId('tree-changes')).toHaveText('2');
});
}

test('TreeSelect leaf-only retry empty disabled keeps the same commit boundary', async ({ page }) => {
  await page.goto('/?view=tree-select&onlyLeaf=true&empty=true');
  await page.getByRole('button', { name: 'Departments', exact: true }).press('Enter');
  await expect(page.getByRole('treeitem', { name: 'Engineering', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  const sales = page.getByRole('treeitem', { name: 'Sales', exact: true });
  await expect(sales).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(sales).toHaveAttribute('aria-busy', 'true');
  await page.getByTestId('reject-sales').dispatchEvent('click');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByTestId('tree-changes')).toHaveText('0');

  await page.keyboard.press('Enter');
  await expect(page.getByTestId('tree-load-calls')).toHaveText('2');
  await page.getByTestId('resolve-sales').dispatchEvent('click');
  await expect(sales).toHaveAttribute('aria-busy', 'false');
  await expect(sales).not.toHaveAttribute('aria-expanded');
  await expect(page.getByTestId('tree-changes')).toHaveText('0');

  await page.getByTestId('toggle-disabled').dispatchEvent('click');
  await expect(sales).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('tree-changes')).toHaveText('0');

  await page.getByTestId('toggle-disabled').dispatchEvent('click');
  await expect(sales).not.toHaveAttribute('aria-disabled');
  await page.keyboard.press('Space');
  await expect(page.getByTestId('tree-value')).toHaveText('["sales"]');
  await expect(page.getByTestId('tree-changes')).toHaveText('1');
  await expect(sales).toBeFocused();
});

test('TreeSelect pointer actions remove or clear without reopening', async ({ page }, testInfo) => {
  const trigger = page.getByRole('button', { name: 'Departments', exact: true });
  await trigger.press('Enter');
  await expect(page.getByRole('treeitem', { name: 'Engineering', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await expect(page.getByTestId('tree-value')).toHaveText('["frontend"]');
  await expect(trigger.locator('button, [role="button"], [tabindex]')).toHaveCount(0);
  await expect.poll(async () => {
    const control = await trigger.boundingBox();
    const panel = await page.getByRole('dialog').boundingBox();
    return !!control && !!panel && panel.y >= control.y + control.height;
  }).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('selection-control.png') });
  await page.getByRole('button', { name: 'Remove Frontend', exact: true }).click();
  await expect(page.getByTestId('tree-value')).toHaveText('[]');
  await expect(page.getByTestId('tree-changes')).toHaveText('2');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  await trigger.press('Enter');
  await expect(page.getByRole('treeitem', { name: 'Engineering', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await expect(page.getByTestId('tree-value')).toHaveText('["frontend"]');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
  await expect(page.getByTestId('tree-value')).toHaveText('[]');
  await expect(page.getByTestId('tree-changes')).toHaveText('4');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});
