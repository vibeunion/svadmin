import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?view=combobox');
});

test('Combobox opens, searches, selects, and restores focus per instance', async ({ page }) => {
  const fixture = page.getByTestId('combobox-fixture');
  const primary = fixture.getByRole('button', { name: 'Primary record', exact: true });
  const secondary = fixture.getByRole('button', { name: 'Secondary record', exact: true });
  await primary.press('Enter');
  await expect(primary).toHaveAttribute('aria-expanded', 'true');
  const primaryList = fixture.getByRole('listbox').first();
  const primaryListId = await primary.getAttribute('aria-controls');
  expect(primaryListId).toBe(await primaryList.getAttribute('id'));
  await expect(primaryList.getByRole('option', { name: 'Record One', exact: true })).toBeVisible();
  const search = fixture.getByRole('combobox', { expanded: true });
  await search.fill('Three');
  await expect(primaryList.getByRole('option', { name: 'Record Three', exact: true })).toBeVisible();
  await primaryList.getByRole('option', { name: 'Record Three', exact: true }).click();
  await expect(fixture.getByTestId('primary-value')).toHaveText('three');
  await expect(primary).toHaveAttribute('aria-expanded', 'false');
  await expect(primary).toBeFocused();
  await expect(fixture.getByTestId('combobox-changes')).toHaveText('1');

  await secondary.press('Space');
  await expect(secondary).toHaveAttribute('aria-expanded', 'true');
  const secondaryListId = await secondary.getAttribute('aria-controls');
  expect(secondaryListId).not.toBe(primaryListId);
  await secondary.press('Escape');
  await expect(secondary).toHaveAttribute('aria-expanded', 'false');
  await expect(secondary).toBeFocused();
  await expect(fixture.getByTestId('secondary-value')).toHaveText('null');
  await expect(fixture.getByTestId('combobox-changes')).toHaveText('1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Combobox cancels a pending search on close and reopens from an empty first page', async ({ page }) => {
  const fixture = page.getByTestId('combobox-fixture');
  const primary = fixture.getByRole('button', { name: 'Primary record', exact: true });
  const log = fixture.getByTestId('combobox-search-log');
  await primary.press('Enter');
  const search = fixture.getByRole('combobox', { expanded: true });
  await search.fill('slow');
  await primary.click();
  await expect(primary).toHaveAttribute('aria-expanded', 'false');

  // 关闭后超过防抖窗口，未执行的搜索不能继续到达 Provider。
  await page.waitForTimeout(450);
  await expect(log).not.toContainText('slow');
  await expect(fixture.getByTestId('primary-value')).toHaveText('null');
  await expect(fixture.getByTestId('combobox-changes')).toHaveText('0');

  await primary.press('Enter');
  const reopened = fixture.getByRole('combobox', { expanded: true });
  await expect(reopened).toHaveValue('');
  await expect(fixture.getByRole('option', { name: 'Record One', exact: true })).toBeVisible();
  await expect(log).not.toContainText('slow');
});

test('Combobox pages real results and resets closed search pagination on reopen', async ({ page }) => {
  const fixture = page.getByTestId('combobox-fixture');
  const primary = fixture.getByRole('button', { name: 'Primary record', exact: true });
  await primary.press('Enter');
  await expect(fixture.getByRole('option', { name: 'Record One', exact: true })).toBeVisible();
  await fixture.getByRole('button', { name: 'Load more' }).click();
  await expect(fixture.getByRole('option', { name: 'Record 12', exact: true })).toBeVisible();

  await primary.press('Escape');
  await expect(primary).toHaveAttribute('aria-expanded', 'false');
  await primary.press('Enter');
  const reopened = fixture.getByRole('combobox', { expanded: true });
  await expect(reopened).toHaveValue('');
  await expect(fixture.getByRole('option', { name: 'Record One', exact: true })).toBeVisible();
  await expect(fixture.getByRole('option', { name: 'Record 12', exact: true })).toHaveCount(0);
  await fixture.getByRole('button', { name: 'Load more' }).click();
  await expect(fixture.getByRole('option', { name: 'Record 12', exact: true })).toBeVisible();
});

test('Combobox ignores a late older search response and keeps the confirmed value', async ({ page }) => {
  const fixture = page.getByTestId('combobox-fixture');
  const primary = fixture.getByRole('button', { name: 'Primary record', exact: true });
  const log = fixture.getByTestId('combobox-search-log');
  await primary.press('Enter');
  const search = fixture.getByRole('combobox', { expanded: true });
  await search.fill('old');
  await expect(log).toContainText('old');
  await search.fill('new');
  await expect(fixture.getByRole('option', { name: 'New result', exact: true })).toBeVisible();

  // 旧请求在新结果之后返回，焦点仍留在弹层。
  await expect(fixture.getByTestId('combobox-old-response-count')).toHaveText('1');
  await expect(fixture.getByRole('option', { name: 'New result', exact: true })).toBeVisible();
  await expect(fixture.getByRole('option', { name: 'Old late result', exact: true })).toHaveCount(0);
  await fixture.getByRole('option', { name: 'New result', exact: true }).click();
  await expect(fixture.getByTestId('primary-value')).toHaveText('new-result');
  await expect(fixture.getByTestId('combobox-changes')).toHaveText('1');
  await expect(primary).toBeFocused();

  await primary.press('Enter');
  await expect(fixture.getByRole('combobox', { expanded: true })).toHaveValue('');
  await expect(fixture.getByRole('option', { name: 'Record One', exact: true })).toBeVisible();
  await expect(fixture.getByTestId('primary-value')).toHaveText('new-result');
  await expect(fixture.getByTestId('combobox-changes')).toHaveText('1');
});

test('Combobox aborts the older search before its late response', async ({ page }) => {
  const fixture = page.getByTestId('combobox-fixture');
  const primary = fixture.getByRole('button', { name: 'Primary record', exact: true });
  const log = fixture.getByTestId('combobox-search-log');
  await primary.press('Enter');
  const search = fixture.getByRole('combobox', { expanded: true });
  await search.fill('old');
  await expect(log).toContainText('old');
  await search.fill('new');
  await expect(fixture.getByRole('option', { name: 'New result', exact: true })).toBeVisible();
  // 新查询派发后，旧请求的 AbortSignal 必须已真实中止。
  await expect(fixture.getByTestId('combobox-aborted-count')).toHaveText(/^[1-9]\d*$/);
  await expect(fixture.getByTestId('combobox-old-response-count')).toHaveText('1');
  await expect(fixture.getByRole('option', { name: 'Old late result', exact: true })).toHaveCount(0);
  await expect(fixture.getByRole('option', { name: 'New result', exact: true })).toBeVisible();
});

test('Combobox reports a timed-out search and recovers on the next query', async ({ page }) => {
  await page.goto('/?view=combobox&scenario=timeout&timeout=150');
  const fixture = page.getByTestId('combobox-fixture');
  const primary = fixture.getByRole('button', { name: 'Primary record', exact: true });
  await primary.press('Enter');
  const search = fixture.getByRole('combobox', { expanded: true });
  await search.fill('stall');
  await expect(fixture.getByRole('alert')).toContainText('Unable to load options.');
  await expect(fixture.getByTestId('combobox-aborted-count')).not.toHaveText('0');

  await search.fill('');
  await expect(fixture.getByRole('alert')).toHaveCount(0);
  await expect(fixture.getByRole('option', { name: 'Record One', exact: true })).toBeVisible();
});

test('Combobox virtualizes more than 1000 paged candidates and selects a far row with the keyboard', async ({ page }) => {
  await page.goto('/?view=combobox&scenario=large');
  const fixture = page.getByTestId('combobox-fixture');
  const primary = fixture.getByRole('button', { name: 'Primary record', exact: true });
  const requests = fixture.getByTestId('combobox-request-count');
  await primary.press('Enter');
  await expect(fixture.getByRole('option', { name: 'Record 0001', exact: true })).toBeVisible();
  const initialRequests = Number(await requests.textContent());

  for (let next = initialRequests + 1; next <= initialRequests + 5; next += 1) {
    const more = fixture.getByRole('button', { name: 'Load more' });
    await expect(more).toHaveAttribute('aria-disabled', 'false');
    await more.click();
    await expect(requests).toHaveText(String(next));
  }
  await expect(fixture.getByRole('button', { name: 'Load more' })).toHaveCount(0);
  // 1200 个候选只窗口化渲染少量行。
  expect(await fixture.getByRole('option').count()).toBeLessThan(200);

  const search = fixture.getByRole('combobox', { expanded: true });
  await search.press('End');
  const activeId = await search.getAttribute('aria-activedescendant');
  expect(activeId).not.toBeNull();
  const active = page.locator(`[id="${activeId}"]`);
  await expect(active).toBeVisible();
  await expect(active).toHaveText('Record 1200');
  await search.press('Enter');
  await expect(fixture.getByTestId('primary-value')).toHaveText('large-1200');
});

test('Combobox navigates 1200 virtual candidates with Home, End and continuous arrows', async ({ page }) => {
  await page.goto('/?view=combobox&scenario=large');
  const fixture = page.getByTestId('combobox-fixture');
  const primary = fixture.getByRole('button', { name: 'Primary record', exact: true });
  const requests = fixture.getByTestId('combobox-request-count');
  await primary.press('Enter');
  await expect(fixture.getByRole('option', { name: 'Record 0001', exact: true })).toBeVisible();
  const initialRequests = Number(await requests.textContent());
  for (let next = initialRequests + 1; next <= initialRequests + 5; next += 1) {
    await fixture.getByRole('button', { name: 'Load more' }).click();
    await expect(requests).toHaveText(String(next));
  }

  const search = fixture.getByRole('combobox', { expanded: true });
  await search.press('Home');
  let activeId = await search.getAttribute('aria-activedescendant');
  expect(activeId).not.toBeNull();
  await expect(page.locator(`[id="${activeId}"]`)).toHaveText('Record 0001');
  await search.press('Enter');
  await expect(fixture.getByTestId('primary-value')).toHaveText('large-1');

  await primary.press('Enter');
  const reopened = fixture.getByRole('combobox', { expanded: true });
  await expect(fixture.getByRole('option', { name: 'Record 0001', exact: true })).toBeVisible();
  for (let index = 0; index < 40; index += 1) await reopened.press('ArrowDown');
  activeId = await reopened.getAttribute('aria-activedescendant');
  expect(activeId).not.toBeNull();
  const active = page.locator(`[id="${activeId}"]`);
  await expect(active).toBeVisible();
  await expect(active).toHaveText('Record 0040');
  await reopened.press('Enter');
  await expect(fixture.getByTestId('primary-value')).toHaveText('large-40');
});

test('Combobox hides a confirmed selection and options after auth session reset', async ({ page }) => {
  const fixture = page.getByTestId('combobox-fixture');
  const primary = fixture.getByRole('button', { name: 'Primary record', exact: true });
  await primary.press('Enter');
  await fixture.getByRole('option', { name: 'Record One', exact: true }).click();
  await expect(fixture.getByTestId('primary-value')).toHaveText('one');
  await expect(primary).toContainText('Record One');

  await fixture.getByTestId('combobox-logout').click();
  await expect(primary).toContainText('Choose record');
  await expect(primary).not.toContainText('Record One');
  await primary.press('Enter');
  await expect(fixture.getByRole('option')).toHaveCount(0);
});

test('AutoComplete clears the selected value with the public clear entry', async ({ page }) => {
  await page.goto('/?view=autocomplete');
  const fixture = page.getByTestId('autocomplete-fixture');
  const input = fixture.getByRole('combobox', { name: 'Async record' });
  await input.fill('Three');
  await fixture.getByRole('option', { name: 'Record Three', exact: true }).click();
  await expect(fixture.getByTestId('autocomplete-value')).toHaveText('three');
  await fixture.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(fixture.getByTestId('autocomplete-value')).toHaveText('null');
  await expect(input).toHaveValue('');
  await expect(fixture.getByTestId('autocomplete-changes')).toHaveText('2');
});

test('AutoComplete syncs an externally cleared value while the menu is open', async ({ page }) => {
  await page.goto('/?view=autocomplete');
  const fixture = page.getByTestId('autocomplete-fixture');
  const input = fixture.getByRole('combobox', { name: 'Async record' });
  await fixture.getByTestId('autocomplete-set-external').click();
  await expect(input).toHaveValue('Record Two');
  await input.focus();
  await expect(fixture.getByRole('listbox')).toBeVisible();
  await fixture.getByTestId('autocomplete-clear-external').click();
  await expect(input).toHaveValue('');
});

test('AutoComplete searches, selects, and keeps the confirmed label', async ({ page }) => {
  await page.goto('/?view=autocomplete');
  const fixture = page.getByTestId('autocomplete-fixture');
  const input = fixture.getByRole('combobox', { name: 'Async record' });
  await input.fill('Three');
  await fixture.getByRole('option', { name: 'Record Three', exact: true }).click();
  await expect(fixture.getByTestId('autocomplete-value')).toHaveText('three');
  await expect(fixture.getByTestId('autocomplete-changes')).toHaveText('1');
  await expect(input).toHaveValue('Record Three');
  await input.focus();
  await input.press('Escape');
  await expect(fixture.getByRole('listbox')).toHaveCount(0);
  await expect(input).toHaveValue('Record Three');
});

test('AutoComplete reselects from fresh candidates after controlled, searched and Escape-restored values', async ({ page }) => {
  await page.goto('/?view=autocomplete');
  const fixture = page.getByTestId('autocomplete-fixture');
  const input = fixture.getByRole('combobox', { name: 'Async record' });

  await fixture.getByTestId('autocomplete-set-external').click();
  await expect(input).toHaveValue('Record Two');
  await input.click();
  await expect(fixture.getByRole('option', { name: 'Record One', exact: true })).toBeVisible();
  await fixture.getByRole('option', { name: 'Record One', exact: true }).click();
  await expect(fixture.getByTestId('autocomplete-value')).toHaveText('one');
  await expect(fixture.getByTestId('autocomplete-changes')).toHaveText('1');
  await expect(input).toHaveValue('Record One');

  await input.fill('Three');
  await fixture.getByRole('option', { name: 'Record Three', exact: true }).click();
  await expect(fixture.getByTestId('autocomplete-value')).toHaveText('three');
  await expect(fixture.getByTestId('autocomplete-changes')).toHaveText('2');
  await input.click();
  await expect(fixture.getByRole('option', { name: 'Record One', exact: true })).toBeVisible();
  await fixture.getByRole('option', { name: 'Record One', exact: true }).click();
  await expect(fixture.getByTestId('autocomplete-value')).toHaveText('one');
  await expect(fixture.getByTestId('autocomplete-changes')).toHaveText('3');

  await input.click();
  await input.fill('Two');
  await expect(fixture.getByRole('option', { name: 'Record Two', exact: true })).toBeVisible();
  await input.press('Escape');
  await expect(input).toHaveValue('Record One');
  await expect(fixture.getByRole('listbox')).toHaveCount(0);
  await input.click();
  await expect(fixture.getByRole('option', { name: 'Record Three', exact: true })).toBeVisible();
  await fixture.getByRole('option', { name: 'Record Three', exact: true }).click();
  await expect(fixture.getByTestId('autocomplete-value')).toHaveText('three');
  await expect(fixture.getByTestId('autocomplete-changes')).toHaveText('4');
  await expect(input).toHaveValue('Record Three');
});
