import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?view=relation');
});

test('RelationPicker keeps drafts local across search, pagination, cancel, and tenant changes', async ({ page }) => {
  const fixture = page.getByTestId('relation-fixture');
  const trigger = fixture.getByRole('button', { name: /^Select/ });
  await expect(trigger).toBeEnabled();
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Choose records' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('checkbox', { name: 'Row 1', exact: true }).click();
  await expect(page.getByTestId('relation-changes')).toHaveText('0');
  const search = dialog.getByRole('textbox', { name: /^Search/ });
  await search.fill('row');
  await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(dialog.getByRole('checkbox', { name: 'Row 2', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('relation-changes')).toHaveText('0');
  await trigger.press('Space');
  const reopened = page.getByRole('dialog', { name: 'Choose records' });
  await expect(reopened.getByRole('textbox', { name: /^Search/ })).toHaveValue('');
  await expect(reopened.getByRole('checkbox', { name: 'Row 1', exact: true })).not.toBeChecked();
  await expect(reopened.getByRole('checkbox', { name: 'Row 2', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Switch tenant', exact: true }).dispatchEvent('click');
  await expect(reopened).toBeHidden();
  await expect(page.getByTestId('relation-changes')).toHaveText('0');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('RelationPicker drops loaded pages and drafts when list permission is revoked', async ({ page }) => {
  const fixture = page.getByTestId('relation-fixture');
  const changes = page.getByTestId('relation-changes');
  const trigger = fixture.getByRole('button', { name: /^Select/ });
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Choose records' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('checkbox', { name: 'Row 1', exact: true }).click();
  await dialog.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(dialog.getByRole('checkbox', { name: 'Row 2', exact: true })).toBeVisible();
  await page.getByTestId('revoke-list').dispatchEvent('click');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeDisabled();
  await expect(fixture.getByText('Row 1', { exact: true })).toHaveCount(0);
  await expect(changes).toHaveText('0');
  await page.getByTestId('restore-list').click();
  await expect(trigger).toBeEnabled();
  await trigger.press('Enter');
  const reopened = page.getByRole('dialog', { name: 'Choose records' });
  await expect(reopened.getByRole('checkbox', { name: 'Row 2', exact: true })).toHaveCount(0);
  await expect(reopened.getByRole('checkbox', { name: 'Row 1', exact: true })).not.toBeChecked();
  await expect(reopened.getByRole('textbox', { name: /^Search/ })).toHaveValue('');
  await expect(changes).toHaveText('0');
});

test('RelationPicker recovers a failed second page without leaking the error, duplicating retries, or submitting early', async ({ page }) => {
  const fixture = page.getByTestId('relation-fixture');
  const changes = page.getByTestId('relation-changes');
  const pageTwoCalls = page.getByTestId('page-two-calls');
  await fixture.getByTestId('fail-page-two').click();
  const trigger = fixture.getByRole('button', { name: /^Select/ });
  await expect(trigger).toBeEnabled();
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Choose records' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('checkbox', { name: 'Row 1', exact: true }).click();
  await expect(changes).toHaveText('0');
  await dialog.getByRole('button', { name: 'Load more', exact: true }).click();
  const alert = dialog.getByRole('alert');
  await expect(alert).toBeVisible();
  await expect(alert).toHaveText('Unable to load options.');
  await expect(dialog).not.toContainText('PRIVATE');
  const confirm = dialog.getByRole('button', { name: 'Confirm', exact: true });
  await expect(confirm).toBeDisabled();
  await page.keyboard.press('Enter');
  await expect(changes).toHaveText('0');
  await fixture.getByTestId('slow-page-two').dispatchEvent('click');
  const retry = dialog.getByRole('button', { name: 'Retry', exact: true });
  await retry.focus();
  await page.keyboard.press('Enter');
  await expect(pageTwoCalls).toHaveText('2');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  await expect(pageTwoCalls).toHaveText('2');
  await expect(confirm).toBeDisabled();
  await expect(changes).toHaveText('0');
  await fixture.getByTestId('release-page-two').dispatchEvent('click');
  await expect(dialog.getByRole('checkbox', { name: 'Row 2', exact: true })).toBeVisible();
  await expect(dialog.getByRole('checkbox', { name: 'Row 1', exact: true })).toBeChecked();
  await dialog.getByRole('checkbox', { name: 'Row 2', exact: true }).click();
  await expect(confirm).toBeEnabled();
  await confirm.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(changes).toHaveText('1');
  await expect(page.getByTestId('relation-value')).toHaveText('[1,2]');
  await expect(pageTwoCalls).toHaveText('2');
  await expect(dialog).toBeHidden();
});

for (const action of ['Escape', 'Cancel'] as const) {
  test(`RelationPicker does not submit a recovered draft after ${action}`, async ({ page }) => {
    const fixture = page.getByTestId('relation-fixture');
    await fixture.getByTestId('fail-page-two').click();
    const trigger = fixture.getByRole('button', { name: /^Select/ });
    await expect(trigger).toBeEnabled();
    await trigger.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Choose records' });
    await dialog.getByRole('checkbox', { name: 'Row 1', exact: true }).click();
    await dialog.getByRole('button', { name: 'Load more', exact: true }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await dialog.getByRole('button', { name: 'Retry', exact: true }).click();
    await dialog.getByRole('checkbox', { name: 'Row 2', exact: true }).click();
    if (action === 'Escape') await page.keyboard.press('Escape');
    else await dialog.getByRole('button', { name: 'Cancel', exact: true }).press('Enter');
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('relation-changes')).toHaveText('0');
    await trigger.press('Space');
    const reopened = page.getByRole('dialog', { name: 'Choose records' });
    await expect(reopened.getByRole('checkbox', { name: 'Row 1', exact: true })).not.toBeChecked();
    await expect(page.getByTestId('relation-changes')).toHaveText('0');
  });
}
