import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const screenshots = 'test-results/enterprise/screenshots';
test('RolesSettings separates loading, failure and retry from actual permission grants', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=roles');
  const settings = page.getByTestId('roles-settings');
  const toggles = settings.getByRole('button', { name: /^Toggle / });
  await expect(settings.getByRole('status')).toBeVisible();
  await expect(settings).not.toContainText('No roles available');
  await expect(toggles).toHaveCount(0);
  await page.getByRole('button', { name: 'Reject roles 1', exact: true }).click();
  await expect(settings.getByRole('alert')).toContainText('Operation failed');
  await settings.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(settings.getByRole('status')).toBeVisible();
  await page.getByRole('button', { name: 'Resolve roles 2', exact: true }).click();
  await expect(settings.locator('select')).toHaveValue('reader');
  await expect(settings.getByRole('status')).toBeVisible();
  await expect(toggles).toHaveCount(0);
  await expect(settings.locator('select')).toHaveValue('reader');
  if (testInfo.project.name.endsWith('narrow')) {
    await expect(settings.locator('select')).toBeVisible();
  } else {
    await expect(settings.getByRole('button', { name: 'Reader reader', exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Reject reader 3', exact: true }).click();
  await expect(settings.getByRole('alert')).toContainText('Operation failed');
  await expect(settings.locator('select')).toHaveValue('reader');
  await expect(settings.locator('select')).toBeEnabled();
  await expect(toggles).toHaveCount(0);
  await expect(page.getByTestId('roles-reads')).toHaveText('3');
  await settings.getByRole('button', { name: 'Retry', exact: true }).press('Enter');
  await expect(settings.getByRole('status')).toBeVisible();
  await page.getByRole('button', { name: 'Resolve reader 4', exact: true }).click();
  await expect(settings.getByRole('button', { name: 'Toggle Detail', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const create = settings.getByRole('button', { name: 'Toggle Create', exact: true });
  await create.press('Enter');
  await expect(page.getByTestId('roles-writes')).toHaveText('1');
  await expect(page.getByTestId('roles-feedback')).toHaveText('Operation failed');
  await expect(settings.getByRole('status')).toBeVisible();
  await expect(toggles).toHaveCount(0);
  await expect(settings.locator('select')).toHaveValue('reader');
  await page.getByRole('button', { name: 'Resolve reader 5', exact: true }).click();
  await expect(create).toHaveAttribute('aria-pressed', 'false');
  await create.press('Space');
  await expect(page.getByTestId('roles-writes')).toHaveText('2');
  await expect(create).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('roles-last-write')).toHaveText(JSON.stringify({
    role: 'reader', permissions: { orders: ['read', 'create'] },
  }));
  await expect(page.locator('body')).not.toContainText('PRIVATE_ROLE');
  await page.screenshot({ path: testInfo.outputPath('roles-recovered.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('RolesSettings keeps role navigation usable and ignores a late rejected permission read', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=roles');
  const settings = page.getByTestId('roles-settings');
  await page.getByRole('button', { name: 'Resolve roles 1', exact: true }).click();
  await expect(settings.getByRole('status')).toBeVisible();
  if (testInfo.project.name.endsWith('narrow')) {
    await settings.locator('select').selectOption('editor');
  } else {
    await settings.getByRole('button', { name: 'Editor editor', exact: true }).press('Enter');
  }
  await expect(settings.locator('select')).toHaveValue('editor');
  await page.getByRole('button', { name: 'Resolve editor 3', exact: true }).click();
  await expect(settings.getByRole('button', { name: 'Toggle Edit', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Reject reader 2', exact: true }).click();
  await expect(settings.getByRole('alert')).toHaveCount(0);
  await expect(settings.getByRole('button', { name: 'Toggle Edit', exact: true })).toBeEnabled();
  await expect(settings.locator('select')).toHaveValue('editor');
  await expect(page.getByTestId('roles-reads')).toHaveText('3');
  await expect(page.getByTestId('roles-writes')).toHaveText('0');
  await expect(page.getByTestId('roles-feedback')).toBeEmpty();
  expect(errors).toEqual([]);
});

test('RolesSettings states missing permission-read capability without rendering unknown grants', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=roles&no-permission-read');
  const settings = page.getByTestId('roles-settings');
  await page.getByRole('button', { name: 'Resolve roles 1', exact: true }).click();
  await expect(settings.locator('select')).toHaveValue('reader');
  await expect(settings.getByRole('alert')).toContainText('RBAC management is not supported by the current data provider');
  await expect(settings.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  await expect(settings.getByRole('button', { name: /^Toggle / })).toHaveCount(0);
  if (testInfo.project.name.endsWith('narrow')) {
    await settings.locator('select').selectOption('editor');
  } else {
    await settings.getByRole('button', { name: 'Editor editor', exact: true }).press('Enter');
  }
  await expect(settings.locator('select')).toHaveValue('editor');
  await expect(settings.getByRole('alert')).toContainText('RBAC management is not supported by the current data provider');
  await expect(settings.getByRole('button', { name: /^Toggle / })).toHaveCount(0);
  await expect(settings.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('roles-reads')).toHaveText('1');
  await expect(page.getByTestId('roles-writes')).toHaveText('0');
  await expect(page.locator('body')).not.toContainText('PRIVATE_ROLE');
  expect(errors).toEqual([]);
});

for (const scope of ['provider', 'tenant'] as const) {
  for (const outcome of ['Resolve', 'Reject'] as const) {
    test(`RolesSettings keeps the new save locked after old write ${outcome} on ${scope} replacement`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/?view=roles&hold-writes');
      const settings = page.getByTestId('roles-settings');
      await page.getByRole('button', { name: 'Resolve roles 1', exact: true }).click();
      await page.getByRole('button', { name: 'Resolve reader 2', exact: true }).click();
      await settings.getByRole('button', { name: 'Toggle Create', exact: true }).press('Enter');
      await expect(page.getByTestId('roles-writes')).toHaveText('1');
      await page.getByRole('button', { name: `Replace ${scope}`, exact: true }).click();
      await page.getByRole('button', { name: 'Resolve new-roles 3', exact: true }).click();
      await page.getByRole('button', { name: 'Resolve new-reader 4', exact: true }).click();
      const detail = settings.getByRole('button', { name: 'Toggle Detail', exact: true });
      const create = settings.getByRole('button', { name: 'Toggle Create', exact: true });
      await expect(create).toHaveAttribute('aria-pressed', 'false');
      await detail.press('Enter');
      await expect(page.getByTestId('roles-writes')).toHaveText('2');
      await expect(detail).toBeDisabled();
      await page.getByRole('button', { name: `${outcome} write 1`, exact: true }).click();
      await expect(detail).toBeDisabled();
      await expect(detail).toHaveAttribute('aria-pressed', 'true');
      await expect(create).toHaveAttribute('aria-pressed', 'false');
      await expect(settings.getByRole('button', { name: 'Toggle Edit', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(settings.locator('select option:checked')).toHaveText('New Reader');
      await expect(page.getByTestId('roles-reads')).toHaveText('4');
      await expect(page.getByTestId('roles-feedback')).toBeEmpty();
      await expect(settings.getByRole('alert')).toHaveCount(0);
      await page.getByRole('button', { name: 'Resolve write 2', exact: true }).click();
      await expect(detail).toBeEnabled();
      await expect(detail).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByTestId('roles-last-write')).toHaveText(JSON.stringify({
        role: 'reader', permissions: { orders: ['update', 'read'] },
      }));
      await expect(page.getByTestId('roles-writes')).toHaveText('2');
      expect(errors).toEqual([]);
    });

    test(`RolesSettings isolates a late ${outcome} after replacing ${scope}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/?view=roles');
      const settings = page.getByTestId('roles-settings');
      await page.getByRole('button', { name: 'Resolve roles 1', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Resolve reader 2', exact: true })).toBeVisible();
      await page.getByRole('button', { name: `Replace ${scope}`, exact: true }).click();
      await expect(settings.getByRole('status')).toBeVisible();
      await expect(settings.getByRole('button', { name: /^Toggle / })).toHaveCount(0);
      await expect(settings.locator('select')).toHaveCount(0);
      await page.getByRole('button', { name: 'Resolve new-roles 3', exact: true }).click();
      await page.getByRole('button', { name: 'Resolve new-reader 4', exact: true }).click();
      const edit = settings.getByRole('button', { name: 'Toggle Edit', exact: true });
      const detail = settings.getByRole('button', { name: 'Toggle Detail', exact: true });
      await expect(edit).toHaveAttribute('aria-pressed', 'true');
      await expect(detail).toHaveAttribute('aria-pressed', 'false');
      await page.getByRole('button', { name: `${outcome} reader 2`, exact: true }).click();
      await expect(settings.locator('select')).toHaveValue('reader');
      await expect(settings.locator('select option:checked')).toHaveText('New Reader');
      await expect(edit).toHaveAttribute('aria-pressed', 'true');
      await expect(detail).toHaveAttribute('aria-pressed', 'false');
      await expect(edit).toBeEnabled();
      await expect(settings.getByRole('alert')).toHaveCount(0);
      await expect(page.getByTestId('roles-feedback')).toBeEmpty();
      await expect(page.getByTestId('roles-reads')).toHaveText('4');
      await expect(page.getByTestId('roles-writes')).toHaveText('0');
      expect(errors).toEqual([]);
    });
  }
}

test('PermissionMatrix isolates roles and keyboard actions inside a host form', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=permissionmatrix');
  const fixture = page.getByTestId('permission-matrix-fixture');
  const first = page.getByTestId('permission-matrix-1');
  const second = page.getByTestId('permission-matrix-2');
  const firstRead = first.getByRole('button', { name: 'Toggle Read', exact: true });
  const secondRead = second.getByRole('button', { name: 'Toggle Read', exact: true });
  await expect(firstRead).toHaveAttribute('aria-pressed', 'true');
  await expect(secondRead).toHaveAttribute('aria-pressed', 'false');
  const firstSelect = first.locator('select');
  const secondSelect = second.locator('select');
  expect(await firstSelect.getAttribute('id')).not.toBe(await secondSelect.getAttribute('id'));
  if (testInfo.project.name.endsWith('narrow')) {
    await second.locator('label').click();
    await expect(secondSelect).toBeFocused();
    await secondSelect.selectOption('editor');
  } else {
    const editor = second.getByRole('button', { name: 'Editor editor', exact: true });
    await editor.focus();
    await page.keyboard.press('Enter');
  }
  await expect(secondSelect).toHaveValue('editor');
  await expect(firstSelect).toHaveValue('reader');
  await expect(fixture.getByTestId('permission-submissions')).toHaveText('0');
  await secondRead.focus();
  await page.keyboard.press('Enter');
  await expect(secondRead).toHaveAttribute('aria-pressed', 'true');
  await expect(firstRead).toHaveAttribute('aria-pressed', 'true');
  await expect(fixture.getByTestId('permission-toggles')).toHaveText('1');
  await expect(fixture.getByTestId('permission-last-toggle')).toHaveText(JSON.stringify({
    instance: 1, role: 'editor', resource: 'orders', action: 'read', grant: true,
  }));
  await expect(secondRead).toBeFocused();
  await page.keyboard.press('Space');
  await expect(secondRead).toHaveAttribute('aria-pressed', 'false');
  await expect(firstRead).toHaveAttribute('aria-pressed', 'true');
  await expect(fixture.getByTestId('permission-toggles')).toHaveText('2');
  await expect(fixture.getByTestId('permission-last-toggle')).toHaveText(JSON.stringify({
    instance: 1, role: 'editor', resource: 'orders', action: 'read', grant: false,
  }));
  await expect(fixture.getByTestId('permission-submissions')).toHaveText('0');
  await fixture.getByRole('button', { name: 'Submit host form', exact: true }).click();
  await expect(fixture.getByTestId('permission-submissions')).toHaveText('1');
  await expect(fixture.getByTestId('permission-toggles')).toHaveText('2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('permission-matrix.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('Company profile retries reads and saves without losing the draft', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=company&fail-load&fail-save');
  const company = page.getByTestId('company-page');
  await expect(company.getByRole('alert')).toContainText('Operation failed');
  await expect(company.getByRole('textbox')).toHaveCount(0);
  await expect(company).not.toContainText('No organization details');
  await expect(page.locator('body')).not.toContainText('PRIVATE_COMPANY_READ_FIXTURE');
  await company.getByRole('button', { name: 'Retry', exact: true }).click();
  const name = company.getByLabel('Organization name', { exact: true });
  await expect(name).toHaveValue('Northwind Research');
  await expect(company.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await name.fill('Northwind Operations');
  await company.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(company.getByRole('alert')).toContainText('Operation failed');
  await expect(name).toHaveValue('Northwind Operations');
  await expect(page.getByTestId('company-saved')).toHaveText('null');
  await expect(page.getByTestId('company-writes')).toHaveText('1');
  await expect(page.locator('body')).not.toContainText('PRIVATE_COMPANY_SAVE_FIXTURE');
  await mkdir('../../../output/playwright/company-profile', { recursive: true });
  await company.screenshot({ path: `../../../output/playwright/company-profile/${testInfo.project.name}-save-failed.png` });
  await company.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(company.getByRole('status')).toHaveText('Organization saved');
  await expect(company.getByRole('alert')).toHaveCount(0);
  await expect(name).toHaveValue('Northwind Operations');
  await expect(page.getByTestId('company-saved')).toHaveText('{"name":"Northwind Operations"}');
  await expect(page.getByTestId('company-writes')).toHaveText('2');
  await expect(company.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('Company profile labels and writes stay within their own instance', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=company&instances=2');
  const instances = page.getByTestId('company-fixture');
  await expect(instances).toHaveCount(2);
  const first = instances.nth(0);
  const second = instances.nth(1);
  const firstName = first.getByLabel('Organization name', { exact: true });
  const secondName = second.getByLabel('Organization name', { exact: true });
  await expect(firstName).toHaveValue('Northwind Research');
  await expect(secondName).toHaveValue('Northwind Research');
  expect(await firstName.getAttribute('id')).not.toBe(await secondName.getAttribute('id'));
  await second.locator('label').filter({ hasText: /^Organization name$/ }).click();
  await expect(secondName).toBeFocused();
  await secondName.fill('Second organization');
  await second.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(second.getByRole('status')).toHaveText('Organization saved');
  await expect(second.getByTestId('company-saved')).toHaveText('{"name":"Second organization"}');
  await expect(second.getByTestId('company-writes')).toHaveText('1');
  await expect(firstName).toHaveValue('Northwind Research');
  await expect(first.getByTestId('company-saved')).toHaveText('null');
  await expect(first.getByTestId('company-writes')).toHaveText('0');
  expect(errors).toEqual([]);
});

test('Member directory retries reads and invitations without leaking provider errors', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=members&fail-load&fail-invite');
  const member = page.getByTestId('member-page');
  await expect(member.getByRole('alert')).toContainText('Operation failed');
  await expect(member).not.toContainText('No members yet');
  await expect(member.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('PRIVATE_MEMBER_READ_FIXTURE');
  await member.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(member.getByRole('row')).toHaveCount(3);
  const email = member.getByLabel('Member email', { exact: true });
  await email.fill('new.member@example.com');
  await member.getByRole('button', { name: 'Send Invite', exact: true }).click();
  await expect(member.getByRole('alert')).toContainText('Operation failed');
  await expect(email).toHaveValue('new.member@example.com');
  await expect(page.getByTestId('member-invited')).toHaveText('null');
  await expect(page.getByTestId('member-last-attempt')).toHaveText('new.member@example.com');
  await expect(page.getByTestId('member-invites')).toHaveText('1');
  await expect(page.locator('body')).not.toContainText('PRIVATE_MEMBER_INVITE_FIXTURE');
  await mkdir('../../../output/playwright/member-directory', { recursive: true });
  await member.screenshot({ path: `../../../output/playwright/member-directory/${testInfo.project.name}-invite-failed.png` });
  await member.getByRole('button', { name: 'Send Invite', exact: true }).click();
  await expect(member.getByRole('status')).toHaveText('Invitation submitted');
  await expect(member.getByRole('alert')).toHaveCount(0);
  await expect(email).toHaveValue('');
  await expect(page.getByTestId('member-invited')).toHaveText('new.member@example.com');
  await expect(page.getByTestId('member-invites')).toHaveText('2');
  expect(errors).toEqual([]);
});

test('Member directory search and invitation fields stay within their own instance', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=members&instances=2');
  const instances = page.getByTestId('member-fixture');
  await expect(instances).toHaveCount(2);
  const first = instances.nth(0);
  const second = instances.nth(1);
  const firstEmail = first.getByLabel('Member email', { exact: true });
  const secondEmail = second.getByLabel('Member email', { exact: true });
  const firstSearch = first.getByLabel('Search members', { exact: true });
  const secondSearch = second.getByLabel('Search members', { exact: true });
  expect(await firstEmail.getAttribute('id')).not.toBe(await secondEmail.getAttribute('id'));
  expect(await firstSearch.getAttribute('id')).not.toBe(await secondSearch.getAttribute('id'));
  await second.locator('label').filter({ hasText: /^Member email$/ }).click();
  await expect(secondEmail).toBeFocused();
  await secondEmail.fill('second@example.com');
  await second.getByRole('button', { name: 'Send Invite', exact: true }).click();
  await expect(second.getByRole('status')).toHaveText('Invitation submitted');
  await expect(firstEmail).toHaveValue('');
  await expect(first.getByTestId('member-invited')).toHaveText('null');
  await expect(second.getByTestId('member-invited')).toHaveText('second@example.com');
  await second.locator('label').filter({ hasText: /^Search members$/ }).click();
  await expect(secondSearch).toBeFocused();
  await secondSearch.fill('Grace');
  await expect(second.getByRole('row')).toHaveCount(2);
  await expect(second.getByRole('rowheader', { name: 'Grace Hopper' })).toBeVisible();
  await expect(second.getByRole('rowheader', { name: 'Ada Lovelace' })).toHaveCount(0);
  await expect(first.getByRole('row')).toHaveCount(3);
  await expect(first.getByTestId('member-invites')).toHaveText('0');
  await expect(second.getByTestId('member-invites')).toHaveText('1');
  await expect(firstSearch).toHaveValue('');
  await secondSearch.fill('No such member');
  await expect(second.getByText('No matching members', { exact: true })).toBeVisible();
  await expect(second.getByRole('table')).toHaveCount(0);
  await expect(first.getByRole('row')).toHaveCount(3);
  await secondSearch.fill('');
  await expect(second.getByRole('row')).toHaveCount(3);
  await expect(first.getByTestId('member-invites')).toHaveText('0');
  await expect(second.getByTestId('member-invites')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('Approval center retries reads and preserves a failed action for retry', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=approval&fail-load&fail-action');
  const center = page.getByTestId('approval-fixture').getByRole('region', { name: 'Approval center' });
  await expect(center.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expect(center).not.toContainText('Expense request');
  await expect(page.locator('body')).not.toContainText('PRIVATE_APPROVAL_READ_FIXTURE');
  await center.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(center.getByRole('heading', { name: 'Expense request', exact: true })).toBeVisible();
  await expect(page.getByTestId('approval-reads')).toHaveText('2');
  await center.getByRole('button', { name: 'Approve', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Comment', exact: true }).fill('Checked invoice');
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Unable to submit the action');
  await expect(dialog).toBeVisible();
  await expect(page.locator('body')).not.toContainText('PRIVATE_APPROVAL_ACTION_FIXTURE');
  await expect(page.getByTestId('approval-transitions')).toHaveText('1');
  await expect(dialog.getByRole('textbox', { name: 'Comment', exact: true })).toHaveValue('Checked invoice');
  const firstAttempt = await page.getByTestId('approval-transition').innerText();
  await mkdir('../../../output/playwright/approval-center', { recursive: true });
  await page.screenshot({ path: `../../../output/playwright/approval-center/${testInfo.project.name}-action-failed.png`, fullPage: true });
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByTestId('approval-transitions')).toHaveText('2');
  await expect(center.getByText('approved', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('approval-transition')).toHaveText(firstAttempt);
  const submitted = JSON.parse(await page.getByTestId('approval-transition').innerText()) as { id: string; expectedVersion: number; action: string; idempotencyKey: string };
  expect(submitted).toMatchObject({ id: 'request-1', expectedVersion: 2, action: 'approve', comment: 'Checked invoice' });
  expect(submitted.idempotencyKey).toMatch(/^request-1:2:approve:/);
  expect(errors).toEqual([]);
});

test('AutoForm keeps error references and keyboard focus isolated across instances', async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=autoform');
  const fixture = page.getByTestId('autoform-fixture');
  const forms = fixture.locator('form');
  await expect(forms).toHaveCount(2);
  for (const form of await forms.all()) {
    const name = form.getByRole('textbox', { name: /^Name/ });
    await expect(name).toHaveAccessibleDescription('A name for the product.');
    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(form.locator('[aria-invalid="true"]')).toHaveCount(2);
    await expect(name).toBeFocused();
    await expect(name).toHaveAccessibleDescription('A name for the product. This field is required');
    const summary = form.getByRole('region', { name: 'Please fix the following errors' });
    const target = summary.getByRole('button', { name: /^Description:/ });
    await page.keyboard.press(browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Shift+Tab' : 'Shift+Tab');
    await expect(target).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(form.getByRole('textbox', { name: /^Description/ })).toBeFocused();
    expect(await form.evaluate(element =>
      [...element.querySelectorAll('[aria-describedby]')].every(node =>
        (node.getAttribute('aria-describedby') ?? '').split(/\s+/).every(id =>
          element.contains(document.getElementById(id)))))).toBe(true);
  }
  expect(await fixture.evaluate(element => {
    const ids = [...element.querySelectorAll<HTMLElement>('[id]')].map(node => node.id);
    return new Set(ids).size === ids.length;
  })).toBe(true);
  await expect(page.getByTestId('autoform-success-count')).toHaveText('0');
  const first = forms.nth(0);
  await first.getByRole('textbox', { name: /^Name/ }).fill('Validated product');
  await first.getByRole('textbox', { name: /^Description/ }).fill('Ready to create');
  await first.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  await expect(page.getByTestId('autoform-payload')).toHaveText(JSON.stringify({
    name: 'Validated product', description: 'Ready to create',
  }));
  await expect(first.locator('[aria-invalid="true"]')).toHaveCount(0);
  await expect(first.getByRole('textbox', { name: /^Name/ }))
    .toHaveAccessibleDescription('A name for the product.');
  await expect(forms.nth(1).locator('[aria-invalid="true"]')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('AutoForm array error focus and correction stay within the submitted instance', async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=autoform&compound=array');
  const forms = page.getByTestId('autoform-fixture').locator('form');
  await expect(forms).toHaveCount(2);
  const addDescriptionProof = async (add: Locator) => add.evaluate(element => {
    const form = element.closest('form');
    const ids = (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    return ids.map(id => {
      const node = element.ownerDocument.getElementById(id);
      return {
        id,
        inForm: !!node && !!form?.contains(node),
        text: node?.textContent?.trim() ?? '',
      };
    });
  });
  const addDescriptionIds: string[][] = [];
  const addHelpIds: string[] = [];
  for (const form of await forms.all()) {
    await form.getByRole('button', { name: 'Save', exact: true }).click();
    const add = form.getByRole('button', { name: 'Add', exact: true });
    await expect(add).toBeFocused();
    await expect(add).toHaveAttribute('aria-invalid', 'true');
    await expect(add).toHaveAccessibleDescription('Add product rows. Add a row');
    const addDescription = await addDescriptionProof(add);
    expect(addDescription).toHaveLength(2);
    expect(addDescription.every(entry => entry.inForm)).toBe(true);
    const help = addDescription.find(entry => entry.text === 'Add product rows.');
    expect(help).toBeDefined();
    expect(addDescription.filter(entry => entry.text === 'Add a row')).toHaveLength(1);
    addDescriptionIds.push(addDescription.map(entry => entry.id));
    addHelpIds.push(help?.id ?? '');
    const summary = form.getByRole('region', { name: 'Please fix the following errors' });
    const backward = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Shift+Tab' : 'Shift+Tab';
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Rows:/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(add).toBeFocused();
    await expect(form.getByRole('group', { name: 'Rows', exact: true }))
      .toHaveAccessibleDescription('Add product rows. Add a row');
  }
  expect(addDescriptionIds).toHaveLength(2);
  expect(addDescriptionIds[0].filter(id => addDescriptionIds[1].includes(id))).toEqual([]);
  await expect(page.getByTestId('autoform-success-count')).toHaveText('0');
  const first = forms.nth(0);
  await first.getByRole('button', { name: 'Add', exact: true }).click();
  const title = first.getByRole('textbox', { name: /^Title/ });
  await title.click();
  await title.pressSequentially('First row', { delay: 25 });
  await expect(title).toBeFocused();
  await expect(title).toHaveValue('First row');
  await first.getByRole('textbox', { name: /^Name/ }).fill('Product with rows');
  await first.getByRole('textbox', { name: /^Description/ }).fill('Ready');
  await first.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  await expect.poll(async () => JSON.parse(await page.getByTestId('autoform-payload').innerText())).toEqual({
    rows: [{ title: 'First row' }], name: 'Product with rows', description: 'Ready',
  });
  const firstAdd = first.getByRole('button', { name: 'Add', exact: true });
  await expect(firstAdd).not.toHaveAttribute('aria-invalid', 'true');
  await expect(firstAdd).toHaveAccessibleDescription('Add product rows.');
  const correctedFirstDescription = await addDescriptionProof(firstAdd);
  expect(correctedFirstDescription).toHaveLength(1);
  expect(correctedFirstDescription[0]).toEqual({
    id: addHelpIds[0], inForm: true, text: 'Add product rows.',
  });
  await expect(first.getByRole('region', { name: 'Please fix the following errors' })).toHaveCount(0);
  await expect(first.getByRole('group', { name: 'Rows', exact: true }))
    .toHaveAccessibleDescription('Add product rows.');
  const secondAdd = forms.nth(1).getByRole('button', { name: 'Add', exact: true });
  await expect(secondAdd).toHaveAttribute('aria-invalid', 'true');
  await expect(secondAdd).toHaveAccessibleDescription('Add product rows. Add a row');
  const secondDescription = await addDescriptionProof(secondAdd);
  expect(secondDescription.map(entry => entry.id).sort()).toEqual([...addDescriptionIds[1]].sort());
  expect(secondDescription.every(entry => entry.inForm)).toBe(true);
  expect(secondDescription.some(entry => entry.text === 'Add a row')).toBe(true);
  await expect(forms.nth(1).getByRole('region', { name: 'Please fix the following errors' }).getByRole('button')).toHaveCount(3);
  await expect(forms.nth(1).getByRole('textbox', { name: /^Title/ })).toHaveCount(0);
  await page.getByTestId('switch-autoform-scope').click();
  await expect(forms.nth(0).getByRole('textbox', { name: /^Title/ })).toHaveCount(0);
  await expect(forms.nth(1).getByRole('textbox', { name: /^Title/ })).toHaveCount(0);
  await expect(forms.nth(0).getByRole('textbox', { name: /^Name/ })).toHaveValue('');
  expect(errors).toEqual([]);
});

test('AutoForm daterange keeps preset focus, keyboard summary return and cross-instance help links', async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=autoform&compound=daterange');
  const fixture = page.getByTestId('autoform-fixture');
  const forms = fixture.locator('form');
  await expect(forms).toHaveCount(2);
  const backward = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Shift+Tab' : 'Shift+Tab';
  const describedIds: string[][] = [];
  for (const form of await forms.all()) {
    const preset = form.getByRole('combobox', { name: 'Quick ranges', exact: true });
    const start = form.locator('input[name="period.start"]');
    const end = form.locator('input[name="period.end"]');
    await expect(preset).toHaveAccessibleDescription('Choose a product period.');
    await expect(start).toHaveAccessibleDescription('Choose a product period.');
    await expect(end).toHaveAccessibleDescription('Choose a product period.');
    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(preset).toBeFocused();
    await expect(preset).toHaveAttribute('aria-invalid', 'true');
    await expect(form.locator('[aria-invalid="true"]')).toHaveCount(5);
    const summary = form.getByRole('region', { name: 'Please fix the following errors' });
    await expect(summary.getByRole('button')).toHaveCount(3);
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(backward);
    const periodError = summary.getByRole('button', { name: /^Period:/ });
    await expect(periodError).toBeFocused();
    const forward = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
    await page.keyboard.press(forward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(forward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(forward);
    await expect(preset).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(periodError).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(preset).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(start).toBeFocused();
    const links = await form.evaluate((element) => {
      const controls = [
        element.querySelector<HTMLElement>('select[aria-label="Quick ranges"]'),
        element.querySelector<HTMLElement>('input[name="period.start"]'),
        element.querySelector<HTMLElement>('input[name="period.end"]'),
      ];
      return controls.map(control => {
        const tokens = (control?.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
        const resolved = tokens.map(id => {
          const node = document.getElementById(id);
          return {
            id,
            connected: node?.isConnected === true,
            inForm: node !== null && element.contains(node),
            text: node?.textContent ?? '',
          };
        });
        return { tokens, resolved };
      });
    });
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link.tokens).toHaveLength(2);
      expect(link.tokens).toEqual(links[0]?.tokens);
      expect(link.resolved.every(node => node.connected && node.inForm)).toBe(true);
      expect(link.resolved.map(node => node.text).join(' ')).toContain('Choose a product period.');
    }
    describedIds.push(links.flatMap(link => link.tokens));
  }
  expect(describedIds).toHaveLength(2);
  expect(describedIds[0]?.some(id => describedIds[1]?.includes(id))).toBe(false);
  await expect(page.getByTestId('autoform-success-count')).toHaveText('0');
  const first = forms.nth(0);
  const firstPreset = first.getByRole('combobox', { name: 'Quick ranges', exact: true });
  const firstStart = first.locator('input[name="period.start"]');
  const firstEnd = first.locator('input[name="period.end"]');
  await firstPreset.selectOption('0');
  await expect(firstStart).toHaveValue('2026-09-01');
  await expect(firstEnd).toHaveValue('2026-09-07');
  await first.getByRole('textbox', { name: /^Name/ }).fill('Period product');
  await first.getByRole('textbox', { name: /^Description/ }).fill('Ready with a date range');
  await first.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  await expect.poll(async () => JSON.parse(await page.getByTestId('autoform-payload').innerText())).toEqual({
    period: { start: '2026-09-01', end: '2026-09-07' },
    name: 'Period product',
    description: 'Ready with a date range',
  });
  await expect(first.locator('[aria-invalid="true"]')).toHaveCount(0);
  await expect(first.getByRole('region', { name: 'Please fix the following errors' })).toHaveCount(0);
  await expect(firstPreset).toHaveAccessibleDescription('Choose a product period.');
  await expect(firstStart).toHaveAccessibleDescription('Choose a product period.');
  await expect(firstEnd).toHaveAccessibleDescription('Choose a product period.');
  const retained = await first.evaluate((element) => {
    const controls = [
      element.querySelector<HTMLElement>('select[aria-label="Quick ranges"]'),
      element.querySelector<HTMLElement>('input[name="period.start"]'),
      element.querySelector<HTMLElement>('input[name="period.end"]'),
    ];
    return controls.map(control => (control?.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean).map(id => {
      const node = document.getElementById(id);
      return node !== null && element.contains(node) && node.isConnected;
    }));
  });
  expect(retained.map(ids => ids.length)).toEqual([1, 1, 1]);
  expect(retained.every(ids => ids.every(Boolean))).toBe(true);
  const second = forms.nth(1);
  await expect(second.locator('[aria-invalid="true"]')).toHaveCount(5);
  await expect(second.getByRole('region', { name: 'Please fix the following errors' }).getByRole('button')).toHaveCount(3);
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('AutoForm tree-select keeps required trigger focus, popup IDREFs and keyboard leaf selection isolated', async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=autoform&compound=tree-select');
  const fixture = page.getByTestId('autoform-fixture');
  const forms = fixture.locator('form');
  await expect(forms).toHaveCount(2);
  const backward = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Shift+Tab' : 'Shift+Tab';
  const forward = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
  const describedIds: string[][] = [];
  for (const form of await forms.all()) {
    const trigger = form.getByRole('button', { name: 'Department', exact: true });
    const dialog = page.getByRole('dialog', { name: 'Department', exact: true });
    await expect(trigger).toHaveAccessibleDescription('Choose a department.');
    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('data-invalid', 'true');
    const summary = form.getByRole('region', { name: 'Please fix the following errors' });
    await expect(summary.getByRole('button')).toHaveCount(3);
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Department:/ })).toBeFocused();
    await page.keyboard.press(forward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Department:/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(trigger).toBeFocused();

    await trigger.press('Enter');
    await expect(dialog).toBeVisible();
    const panelId = await trigger.getAttribute('aria-controls');
    const triggerId = await trigger.getAttribute('id');
    expect(panelId).toBeTruthy();
    expect(triggerId).toBeTruthy();
    await expect(dialog).toHaveAttribute('id', panelId ?? '');
    await expect(dialog).toHaveAttribute('aria-labelledby', triggerId ?? '');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('treeitem', { name: 'Leaf', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(dialog).toBeHidden();

    const links = await trigger.evaluate((element) => {
      const form = element.closest('form');
      const tokens = (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      return {
        tokens,
        resolved: tokens.map(id => {
          const node = document.getElementById(id);
          return {
            id,
            connected: node?.isConnected === true,
            inForm: node !== null && form?.contains(node) === true,
            text: node?.textContent ?? '',
            role: node?.getAttribute('role'),
          };
        }),
      };
    });
    expect(links.tokens).toHaveLength(2);
    expect(links.resolved.every(node => node.connected && node.inForm)).toBe(true);
    expect(links.resolved.map(node => node.text).join(' ')).toContain('Choose a department.');
    const errorToken = links.resolved.find(node => node.role === 'alert')?.id;
    expect(errorToken).toBeTruthy();
    describedIds.push(links.tokens);

    await trigger.press('Enter');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('treeitem', { name: 'Leaf', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(trigger).toBeFocused();
    await expect(dialog).toBeHidden();
    await expect(trigger).toContainText('Leaf');
    await expect(trigger).not.toHaveAttribute('data-invalid', 'true');
    await expect(summary.getByRole('button')).toHaveCount(2);
    const retained = await trigger.evaluate((element) => {
      const form = element.closest('form');
      const tokens = (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      return {
        tokens,
        resolved: tokens.map(id => {
          const node = document.getElementById(id);
          return {
            connected: node?.isConnected === true,
            inForm: node !== null && form?.contains(node) === true,
            text: node?.textContent ?? '',
          };
        }),
      };
    });
    expect(retained.tokens).toEqual(links.tokens.filter(id => id !== errorToken));
    expect(retained.resolved.every(node => node.connected && node.inForm)).toBe(true);
    expect(retained.resolved.map(node => node.text).join(' ')).toContain('Choose a department.');
  }
  expect(describedIds).toHaveLength(2);
  expect(describedIds[0]?.some(id => describedIds[1]?.includes(id))).toBe(false);
  await expect(page.getByTestId('autoform-success-count')).toHaveText('0');

  const first = forms.nth(0);
  await first.getByRole('textbox', { name: /^Name/ }).fill('Department product');
  await first.getByRole('textbox', { name: /^Description/ }).fill('Ready with a department');
  await first.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  await expect.poll(async () => JSON.parse(await page.getByTestId('autoform-payload').innerText())).toEqual({
    department: 'leaf',
    name: 'Department product',
    description: 'Ready with a department',
  });
  await expect(first.locator('[aria-invalid="true"]')).toHaveCount(0);
  await expect(first.getByRole('region', { name: 'Please fix the following errors' })).toHaveCount(0);
  await expect(first.getByRole('button', { name: 'Department', exact: true }))
    .toHaveAccessibleDescription('Choose a department.');

  const second = forms.nth(1);
  await expect(second.locator('[aria-invalid="true"]')).toHaveCount(2);
  await expect(second.getByRole('region', { name: 'Please fix the following errors' }).getByRole('button')).toHaveCount(2);
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('AutoForm cascader keeps required trigger focus, popup IDREFs and keyboard selection isolated', async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=autoform&compound=cascader');
  const fixture = page.getByTestId('autoform-fixture');
  const forms = fixture.locator('form');
  await expect(forms).toHaveCount(2);
  const backward = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Shift+Tab' : 'Shift+Tab';
  const forward = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
  const describedIds: string[][] = [];
  for (const form of await forms.all()) {
    const trigger = form.getByRole('button', { name: 'Region', exact: true });
    const dialog = page.getByRole('dialog', { name: 'Region', exact: true });
    await expect(trigger).toHaveAccessibleDescription('Choose a region.');
    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('data-invalid', 'true');
    const summary = form.getByRole('region', { name: 'Please fix the following errors' });
    await expect(summary.getByRole('button')).toHaveCount(3);
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Region:/ })).toBeFocused();
    await page.keyboard.press(forward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(forward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(forward);
    await expect(trigger).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(backward);
    const regionError = summary.getByRole('button', { name: /^Region:/ });
    await expect(regionError).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(trigger).toBeFocused();

    const links = await trigger.evaluate((element) => {
      const form = element.closest('form');
      const tokens = (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      return {
        tokens,
        resolved: tokens.map(id => {
          const node = document.getElementById(id);
          return {
            id,
            connected: node?.isConnected === true,
            inForm: node !== null && form?.contains(node) === true,
            text: node?.textContent ?? '',
            role: node?.getAttribute('role'),
          };
        }),
      };
    });
    expect(links.tokens).toHaveLength(2);
    expect(links.resolved.every(node => node.connected && node.inForm)).toBe(true);
    expect(links.resolved.map(node => node.text).join(' ')).toContain('Choose a region.');
    const errorToken = links.resolved.find(node => node.role === 'alert')?.id;
    expect(errorToken).toBeTruthy();
    describedIds.push(links.tokens);

    await trigger.press('Enter');
    await expect(dialog).toBeVisible();
    const panelId = await trigger.getAttribute('aria-controls');
    const triggerId = await trigger.getAttribute('id');
    expect(panelId).toBeTruthy();
    expect(triggerId).toBeTruthy();
    await expect(dialog).toHaveAttribute('id', panelId ?? '');
    await expect(dialog).toHaveAttribute('aria-labelledby', triggerId ?? '');
    await expect(page.locator(`[id="${panelId}"]`)).toHaveCount(1);
    await expect(page.locator(`[id="${triggerId}"]`)).toHaveCount(1);
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('button', { name: 'East', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(trigger).toContainText('East');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(dialog).toBeHidden();

    await expect(summary.getByRole('button')).toHaveCount(2);
    const retained = await trigger.evaluate((element) => {
      const form = element.closest('form');
      const tokens = (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      return {
        tokens,
        resolved: tokens.map(id => {
          const node = document.getElementById(id);
          return {
            connected: node?.isConnected === true,
            inForm: node !== null && form?.contains(node) === true,
            text: node?.textContent ?? '',
          };
        }),
      };
    });
    expect(retained.tokens).toEqual(links.tokens.filter(id => id !== errorToken));
    expect(retained.resolved.every(node => node.connected && node.inForm)).toBe(true);
    expect(retained.resolved.map(node => node.text).join(' ')).toContain('Choose a region.');
    await expect(trigger).not.toHaveAttribute('data-invalid', 'true');
  }
  expect(describedIds).toHaveLength(2);
  expect(describedIds[0]?.some(id => describedIds[1]?.includes(id))).toBe(false);
  await expect(page.getByTestId('autoform-success-count')).toHaveText('0');

  const first = forms.nth(0);
  await first.getByRole('textbox', { name: /^Name/ }).fill('Region product');
  await first.getByRole('textbox', { name: /^Description/ }).fill('Ready with a region');
  await first.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  await expect.poll(async () => JSON.parse(await page.getByTestId('autoform-payload').innerText())).toEqual({
    region: ['east'],
    name: 'Region product',
    description: 'Ready with a region',
  });
  await expect(first.locator('[aria-invalid="true"]')).toHaveCount(0);
  await expect(first.getByRole('region', { name: 'Please fix the following errors' })).toHaveCount(0);
  await expect(first.getByRole('button', { name: 'Region', exact: true }))
    .toHaveAccessibleDescription('Choose a region.');

  const second = forms.nth(1);
  await expect(second.locator('[aria-invalid="true"]')).toHaveCount(2);
  await expect(second.getByRole('region', { name: 'Please fix the following errors' }).getByRole('button')).toHaveCount(2);
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('AutoForm transfer keeps required checkbox focus, summary keyboard return and payload isolated', async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=autoform&compound=transfer');
  const fixture = page.getByTestId('autoform-fixture');
  const forms = fixture.locator('form');
  await expect(forms).toHaveCount(2);
  const backward = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Shift+Tab' : 'Shift+Tab';
  const forward = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
  const describedIds: string[][] = [];
  for (const form of await forms.all()) {
    const group = form.getByRole('group', { name: /^Roles/ });
    const firstCheckbox = group.getByRole('checkbox', { name: '源列表', exact: true });
    await expect(group).toHaveAccessibleDescription('Assign product roles.');
    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(group).toHaveAttribute('data-invalid', 'true');
    await expect(firstCheckbox).toBeFocused();
    const summary = form.getByRole('region', { name: 'Please fix the following errors' });
    await expect(summary.getByRole('button')).toHaveCount(3);
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Roles:/ })).toBeFocused();
    await page.keyboard.press(forward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(forward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(forward);
    await expect(firstCheckbox).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Roles:/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(firstCheckbox).toBeFocused();

    const refs = await group.evaluate((element) => {
      const form = element.closest('form');
      const resolve = (attribute: string) => (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean).map((id) => {
        const node = document.getElementById(id);
        return {
          id,
          connected: node?.isConnected === true,
          inForm: node !== null && form?.contains(node) === true,
          text: node?.textContent ?? '',
          role: node?.getAttribute('role'),
        };
      });
      return { label: resolve('aria-labelledby'), description: resolve('aria-describedby') };
    });
    expect(refs.label).toHaveLength(1);
    expect(refs.label[0]?.connected && refs.label[0]?.inForm).toBe(true);
    expect(refs.label[0]?.text).toContain('Roles');
    expect(refs.description).toHaveLength(2);
    expect(refs.description.every(node => node.connected && node.inForm)).toBe(true);
    expect(refs.description.map(node => node.text).join(' ')).toContain('Assign product roles.');
    expect(refs.description.find(node => node.role === 'alert')?.id).toBeTruthy();
    describedIds.push(refs.description.map(node => node.id));
  }
  expect(describedIds).toHaveLength(2);
  expect(describedIds[0]?.some(id => describedIds[1]?.includes(id))).toBe(false);
  await expect(page.getByTestId('autoform-success-count')).toHaveText('0');

  const first = forms.nth(0);
  const firstGroup = first.getByRole('group', { name: /^Roles/ });
  const firstCheckbox = firstGroup.getByRole('checkbox', { name: '源列表', exact: true });
  const firstSummary = first.getByRole('region', { name: 'Please fix the following errors' });
  await firstSummary.getByRole('button', { name: /^Roles:/ }).click();
  await expect(firstCheckbox).toBeFocused();
  const administrator = firstGroup.getByRole('checkbox', { name: 'Administrator', exact: true });
  const tabUntil = async (target: typeof administrator) => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (await target.evaluate(node => node === document.activeElement)) return;
      await page.keyboard.press(forward);
    }
    await expect(target).toBeFocused();
  };
  await tabUntil(administrator);
  await expect(administrator).toBeFocused();
  await page.keyboard.press('Space');
  await expect(administrator).toBeChecked();
  const moveRight = firstGroup.getByRole('button', { name: '转移所选项' });
  await tabUntil(moveRight);
  await expect(moveRight).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(moveRight).toBeDisabled();
  await expect(first.locator('input[name="roles[]"]')).toHaveValue('admin');
  await expect(firstSummary.getByRole('button')).toHaveCount(2);

  await first.getByRole('textbox', { name: /^Name/ }).fill('Transfer product');
  await first.getByRole('textbox', { name: /^Description/ }).fill('Ready with a role');
  await first.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  await expect.poll(async () => JSON.parse(await page.getByTestId('autoform-payload').innerText())).toEqual({
    roles: ['admin'],
    name: 'Transfer product',
    description: 'Ready with a role',
  });
  await expect(first.locator('[aria-invalid="true"]')).toHaveCount(0);
  await expect(firstSummary).toHaveCount(0);
  await expect(firstGroup).not.toHaveAttribute('data-invalid', 'true');
  await expect(firstGroup).toHaveAccessibleDescription('Assign product roles.');
  const retained = await firstGroup.evaluate((element) => {
    const form = element.closest('form');
    return (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean).map((id) => {
      const node = document.getElementById(id);
      return {
        connected: node?.isConnected === true,
        inForm: node !== null && form?.contains(node) === true,
        text: node?.textContent ?? '',
        role: node?.getAttribute('role'),
      };
    });
  });
  expect(retained).toHaveLength(1);
  expect(retained[0]?.connected && retained[0]?.inForm).toBe(true);
  expect(retained[0]?.text).toContain('Assign product roles.');
  expect(retained[0]?.role).not.toBe('alert');

  const second = forms.nth(1);
  const secondGroup = second.getByRole('group', { name: /^Roles/ });
  await expect(secondGroup).toHaveAttribute('data-invalid', 'true');
  await expect(second.locator('[aria-invalid="true"]')).toHaveCount(2);
  await expect(second.getByRole('region', { name: 'Please fix the following errors' }).getByRole('button')).toHaveCount(3);
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('AutoForm richtext keeps contenteditable focus, summary keyboard return and HTML payload isolated', async ({ page, browserName }) => {
  const errors: string[] = [];
  const tiptapWarnings: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // 仅在富文本场景收集 tiptap 告警（例如重复扩展名），保留控制台输出不做抑制。
  page.on('console', (message) => {
    const type = message.type();
    if (type !== 'warning' && type !== 'error') return;
    const text = message.text();
    if (!/tiptap/i.test(text) && !/duplicate extension/i.test(text)) return;
    tiptapWarnings.push(text);
  });
  await page.goto('/?view=autoform&compound=richtext');
  const fixture = page.getByTestId('autoform-fixture');
  const forms = fixture.locator('form');
  await expect(forms).toHaveCount(2);
  const backward = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Shift+Tab' : 'Shift+Tab';
  const forward = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
  const describedIds: string[][] = [];
  for (const form of await forms.all()) {
    const body = form.getByRole('textbox', { name: /^Body/ });
    await expect(body).toHaveAttribute('contenteditable', 'true');
    await expect(body).toHaveAccessibleDescription('Write the product body.');
    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(body).toBeFocused();
    await expect(body).toHaveAttribute('aria-invalid', 'true');
    await expect(body).toHaveAttribute('aria-required', 'true');
    const summary = form.getByRole('region', { name: 'Please fix the following errors' });
    await expect(summary.getByRole('button')).toHaveCount(3);

    const toolbar = form.locator('.svadmin-editor-toolbar');
    await expect(toolbar).toHaveCount(1);
    const descriptionEntry = summary.getByRole('button', { name: /^Description:/ });
    const nameEntry = summary.getByRole('button', { name: /^Name:/ });
    const bodyEntry = summary.getByRole('button', { name: /^Body:/ });

    // 只接受当前 form 内“富文本工具栏”或“当前错误摘要”中的焦点，其它落点视为越界。
    const describeFocus = () => form.evaluate((element) => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return { kind: 'none' as const, label: '' };
      const bar = element.querySelector('.svadmin-editor-toolbar');
      if (bar && bar.contains(active) && active.closest('form') === element) {
        return { kind: 'toolbar' as const, label: (active.getAttribute('aria-label') ?? active.getAttribute('title') ?? '').trim() };
      }
      const region = element.querySelector('[data-svadmin-error-summary]');
      if (region && region.contains(active)) {
        return { kind: 'summary' as const, label: (active.textContent ?? '').trim().split(':')[0]?.trim() ?? '' };
      }
      return { kind: 'outside' as const, label: active.tagName };
    });
    const isFocused = (target: typeof body) => target.evaluate(element => element === document.activeElement);
    const walkTo = async (key: string, target: typeof body, label: string) => {
      const stops: { kind: 'toolbar' | 'summary'; label: string }[] = [];
      for (let step = 0; step < 40; step++) {
        if (await isFocused(target)) return stops;
        await page.keyboard.press(key);
        if (await isFocused(target)) return stops;
        const focus = await describeFocus();
        if (focus.kind === 'outside' || focus.kind === 'none') {
          throw new Error(`${label} keyboard walk left the current form toolbar/summary: ${JSON.stringify(focus)}`);
        }
        expect(focus.label.length).toBeGreaterThan(0);
        stops.push(focus);
      }
      throw new Error(`${label} keyboard walk exceeded 40 bounded steps`);
    };

    const toolbarLabels = (stops: { kind: string; label: string }[]) =>
      stops.filter(stop => stop.kind === 'toolbar').map(stop => stop.label);
    const backwardStops = await walkTo(backward, descriptionEntry, 'Description summary');
    const backwardToolbar = toolbarLabels(backwardStops);
    // 正文之后必须先正向遍历真实工具栏，才能到达摘要，而不是一步跳到摘要。
    expect(backwardStops.every(stop => stop.kind === 'toolbar')).toBe(true);
    expect(backwardToolbar.length).toBeGreaterThan(1);
    expect(new Set(backwardToolbar).size).toBe(backwardToolbar.length);
    await expect(descriptionEntry).toBeFocused();
    await page.keyboard.press(backward);
    await expect(nameEntry).toBeFocused();
    await page.keyboard.press(backward);
    await expect(bodyEntry).toBeFocused();

    // 正向路径：Body 摘要 -> Name -> Description -> 工具栏反向遍历 -> 正文。
    const forwardStops = await walkTo(forward, body, 'Body editor');
    expect(forwardStops.slice(0, 2)).toEqual([
      { kind: 'summary', label: 'Name' },
      { kind: 'summary', label: 'Description' },
    ]);
    const forwardToolbar = toolbarLabels(forwardStops);
    expect(forwardToolbar).toEqual([...backwardToolbar].reverse());
    expect(forwardToolbar.length).toBe(backwardToolbar.length);
    await expect(body).toBeFocused();

    const backwardAgain = await walkTo(backward, descriptionEntry, 'Description summary');
    expect(backwardAgain).toEqual(backwardStops);
    expect(toolbarLabels(backwardAgain)).toEqual(backwardToolbar);
    await page.keyboard.press(backward);
    await expect(nameEntry).toBeFocused();
    await page.keyboard.press(backward);
    await expect(bodyEntry).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(body).toBeFocused();

    const links = await body.evaluate((element) => {
      const form = element.closest('form');
      const resolve = (attribute: string) => (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean).map((id) => {
        const node = document.getElementById(id);
        return {
          id,
          connected: node?.isConnected === true,
          inForm: node !== null && form?.contains(node) === true,
          text: node?.textContent ?? '',
          role: node?.getAttribute('role'),
        };
      });
      return {
        contenteditable: element.getAttribute('contenteditable'),
        invalid: element.getAttribute('aria-invalid'),
        required: element.getAttribute('aria-required'),
        label: resolve('aria-labelledby'),
        description: resolve('aria-describedby'),
      };
    });
    expect(links.contenteditable).toBe('true');
    expect(links.invalid).toBe('true');
    expect(links.required).toBe('true');
    expect(links.label).toHaveLength(1);
    expect(links.label[0]?.connected && links.label[0]?.inForm).toBe(true);
    expect(links.label[0]?.text).toContain('Body');
    expect(links.description).toHaveLength(2);
    expect(links.description.every(node => node.connected && node.inForm)).toBe(true);
    expect(links.description.map(node => node.text).join(' ')).toContain('Write the product body.');
    expect(links.description.find(node => node.role === 'alert')?.id).toBeTruthy();
    expect(new Set([...links.label, ...links.description].map(node => node.id)).size).toBe(3);
    describedIds.push(links.description.map(node => node.id));
  }
  expect(describedIds).toHaveLength(2);
  expect(describedIds[0]?.some(id => describedIds[1]?.includes(id))).toBe(false);
  await expect(page.getByTestId('autoform-success-count')).toHaveText('0');

  const first = forms.nth(0);
  const firstName = first.getByRole('textbox', { name: /^Name/ });
  const firstDescription = first.getByRole('textbox', { name: /^Description/ });
  const firstBody = first.getByRole('textbox', { name: /^Body/ });
  await firstBody.click();
  await firstBody.pressSequentially('Rich body text', { delay: 25 });
  await expect(firstBody).toBeFocused();
  await expect(firstBody).toContainText('Rich body text');
  await firstName.fill('Rich product');
  await firstDescription.fill('Ready with rich text');
  await first.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  await expect.poll(async () => JSON.parse(await page.getByTestId('autoform-payload').innerText())).toEqual({
    body: '<p>Rich body text</p>',
    name: 'Rich product',
    description: 'Ready with rich text',
  });
  await expect(first.locator('[aria-invalid="true"]')).toHaveCount(0);
  await expect(first.getByRole('region', { name: 'Please fix the following errors' })).toHaveCount(0);
  await expect(firstBody).toHaveAccessibleDescription('Write the product body.');
  const retained = await firstBody.evaluate((element) => {
    const form = element.closest('form');
    return (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean).map((id) => {
      const node = document.getElementById(id);
      return {
        id,
        connected: node?.isConnected === true,
        inForm: node !== null && form?.contains(node) === true,
        text: node?.textContent ?? '',
        role: node?.getAttribute('role'),
      };
    });
  });
  expect(retained).toHaveLength(1);
  expect(retained[0]?.connected && retained[0]?.inForm).toBe(true);
  expect(retained[0]?.text).toContain('Write the product body.');
  expect(retained[0]?.role).not.toBe('alert');

  const second = forms.nth(1);
  const secondBody = second.getByRole('textbox', { name: /^Body/ });
  await expect(secondBody).toHaveAttribute('aria-invalid', 'true');
  await expect(secondBody).toHaveAttribute('aria-required', 'true');
  await expect(second.locator('[aria-invalid="true"]')).toHaveCount(3);
  await expect(second.getByRole('region', { name: 'Please fix the following errors' }).getByRole('button')).toHaveCount(3);
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  expect(tiptapWarnings).toEqual([]);
  expect(errors).toEqual([]);
});

test('StepsForm isolates compound error references and keyboard focus across instances', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=stepsform&validate&instances=2');
  const fixtures = page.getByTestId('steps-form-fixture');
  await expect(fixtures).toHaveCount(2);
  for (const fixture of await fixtures.all()) {
    await fixture.getByRole('button', { name: 'Next', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(fixture.getByRole('button', { name: 'Add', exact: true })).toBeFocused();
    const group = fixture.getByRole('group', { name: 'Rows', exact: true });
    await expect(group).toHaveAccessibleDescription('Add at least one item. Add a row');
    expect(await group.evaluate(element =>
      (element.getAttribute('aria-describedby') ?? '').split(/\s+/).every(id =>
        element.closest('form')?.contains(document.getElementById(id))))).toBe(true);
    await expect(fixture.getByTestId('steps-form-writes')).toHaveText('0');
  }
  expect(await fixtures.first().getByRole('alert').getAttribute('id'))
    .not.toBe(await fixtures.nth(1).getByRole('alert').getAttribute('id'));
  const first = fixtures.first();
  await first.getByRole('button', { name: 'Add', exact: true }).focus();
  await page.keyboard.press('Enter');
  await first.getByRole('textbox', { name: 'Item name', exact: true }).fill('Corrected');
  await expect(first.getByRole('group', { name: 'Rows', exact: true }))
    .toHaveAccessibleDescription('Add at least one item.');
  await first.getByRole('button', { name: 'Next', exact: true }).focus();
  await page.keyboard.press('Enter');
  await first.getByRole('button', { name: 'Save', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(first.getByTestId('steps-form-navigation')).toHaveText('1');
  await expect(first.getByTestId('steps-form-payload')).toHaveText('{"rows":[{"name":"Corrected"}]}');
  await expect(fixtures.nth(1).getByRole('alert')).toHaveText('Add a row');
  await expect(fixtures.nth(1).getByTestId('steps-form-writes')).toHaveText('0');
  expect(errors).toEqual([]);
});

test('StepsForm returns to a server-rejected array and permits explicit correction', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=stepsform&fail-save');
  const fixture = page.getByTestId('steps-form-fixture');
  await fixture.getByRole('button', { name: 'Next', exact: true }).click();
  await fixture.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(fixture.getByRole('button', { name: 'Add', exact: true })).toBeFocused();
  await expect(fixture.getByTestId('steps-form-writes')).toHaveText('1');
  await expect(fixture.getByTestId('steps-form-navigation')).toHaveText('0');
  await expect(fixture).not.toContainText('PRIVATE_STEPS_SAVE_ERROR');
  const group = fixture.getByRole('group', { name: 'Rows', exact: true });
  expect(await group.evaluate(element =>
    (element.getAttribute('aria-describedby') ?? '').split(/\s+/).some(id =>
      document.getElementById(id)?.getAttribute('role') === 'alert'))).toBe(true);
  await page.keyboard.press('Enter');
  await fixture.getByRole('textbox', { name: 'Item name', exact: true }).fill('Retry row');
  await fixture.getByRole('button', { name: 'Next', exact: true }).click();
  await fixture.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(fixture.getByTestId('steps-form-navigation')).toHaveText('1');
  await expect(fixture.getByTestId('steps-form-writes')).toHaveText('2');
  await expect(fixture.getByTestId('steps-form-payload')).toHaveText('{"rows":[{"name":"Retry row"}]}');
  expect(errors).toEqual([]);
});

test('StepsForm keeps array identity through typing, steps and submission', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=stepsform');
  const fixture = page.getByTestId('steps-form-fixture');
  await fixture.getByRole('button', { name: 'Add', exact: true }).click();
  const input = fixture.getByRole('textbox', { name: 'Item name', exact: true });
  const original = await input.elementHandle();
  await input.focus();
  for (const char of ['A', 'B', 'C']) {
    await page.keyboard.type(char);
    expect(await original?.evaluate(element => element.isConnected)).toBe(true);
    await expect(input).toBeFocused();
  }
  await fixture.getByRole('button', { name: 'Next', exact: true }).click();
  await fixture.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(input).toHaveValue('ABC');
  await fixture.getByRole('button', { name: 'Next', exact: true }).click();
  await fixture.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(fixture.getByTestId('steps-form-payload')).toHaveText('{"rows":[{"name":"ABC"}]}');
  await expect(fixture.getByTestId('steps-form-writes')).toHaveText('1');
  await expect(fixture.getByTestId('steps-form-navigation')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('StepsForm keeps the array workflow tab order actionable', async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=stepsform');
  const fixture = page.getByTestId('steps-form-fixture');
  const add = fixture.getByRole('button', { name: 'Add', exact: true });
  const remove = fixture.getByRole('button', { name: 'Remove', exact: true });
  const input = fixture.getByRole('textbox', { name: 'Item name', exact: true });
  const cancel = fixture.getByRole('button', { name: 'Cancel', exact: true });
  const next = fixture.getByRole('button', { name: 'Next', exact: true });
  const allControls = browserName === 'webkit' && process.platform === 'darwin';
  const forward = allControls ? 'Alt+Tab' : 'Tab';
  const backward = allControls ? 'Alt+Shift+Tab' : 'Shift+Tab';
  await add.focus();
  await page.keyboard.press('Enter');
  await expect(fixture.getByRole('button', { name: 'Move Up', exact: true })).toBeDisabled();
  await expect(fixture.getByRole('button', { name: 'Move Down', exact: true })).toBeDisabled();
  await page.keyboard.press(forward);
  await expect(remove).toBeFocused();
  await page.keyboard.press(forward);
  await expect(input).toBeFocused();
  await page.keyboard.type('Keyboard row');
  await page.keyboard.press(forward);
  await expect(cancel).toBeFocused();
  await page.keyboard.press(forward);
  await expect(next).toBeFocused();
  for (const target of [cancel, input, remove, add]) {
    await page.keyboard.press(backward);
    await expect(target).toBeFocused();
  }
  for (const target of [remove, input, cancel, next]) {
    await page.keyboard.press(forward);
    await expect(target).toBeFocused();
  }
  await page.keyboard.press('Enter');
  const save = fixture.getByRole('button', { name: 'Save', exact: true });
  const back = fixture.getByRole('button', { name: 'Back', exact: true });
  await expect(save).toBeVisible();
  await back.focus();
  await page.keyboard.press(forward);
  await expect(save).toBeFocused();
  await page.keyboard.press(backward);
  await expect(back).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(input).toHaveValue('Keyboard row');
  await next.focus();
  await page.keyboard.press('Enter');
  await back.focus();
  await page.keyboard.press(forward);
  await expect(save).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(fixture.getByTestId('steps-form-navigation')).toHaveText('1');
  await expect(fixture.getByTestId('steps-form-writes')).toHaveText('1');
  await expect(fixture.getByTestId('steps-form-payload')).toHaveText('{"rows":[{"name":"Keyboard row"}]}');
  expect(errors).toEqual([]);
});

for (const dismissal of ['cancel', 'escape'] as const) {
test(`StepsForm keeps a draft through cancel confirmation: ${dismissal}`, async ({ page, browserName }) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'warning') warnings.push(`${message.text()} @ ${message.location().url}`);
  });
  await page.goto('/?view=stepsform');
  const fixture = page.getByTestId('steps-form-fixture');
  await fixture.getByRole('button', { name: 'Add', exact: true }).click();
  const input = fixture.getByRole('textbox', { name: 'Item name', exact: true });
  await input.fill('Keep this draft');
  const cancel = fixture.getByRole('button', { name: 'Cancel', exact: true });
  await cancel.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  const dialogCancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
  const confirm = dialog.getByRole('button', { name: 'Confirm', exact: true });
  const allControls = browserName === 'webkit' && process.platform === 'darwin';
  const forward = allControls ? 'Alt+Tab' : 'Tab';
  const backward = allControls ? 'Alt+Shift+Tab' : 'Shift+Tab';
  await dialogCancel.focus();
  await page.keyboard.press(forward);
  await expect(confirm).toBeFocused();
  await page.keyboard.press(forward);
  await expect(dialogCancel).toBeFocused();
  await page.keyboard.press(backward);
  await expect(confirm).toBeFocused();
  await page.keyboard.press(backward);
  await expect(dialogCancel).toBeFocused();
  await page.keyboard.press(dismissal === 'cancel' ? 'Enter' : 'Escape');
  await expect(dialog).toHaveCount(0);
  await expect(input).toHaveValue('Keep this draft');
  await expect(cancel).toBeFocused();
  await expect(fixture.getByTestId('steps-form-navigation')).toHaveText('0');
  await cancel.press('Enter');
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  await dialogCancel.focus();
  await page.keyboard.press(forward);
  await expect(confirm).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(fixture.getByTestId('steps-form-navigation')).toHaveText('1');
  await expect(fixture.getByTestId('steps-form-writes')).toHaveText('0');
  // fixture 路由只计数，不卸载表单，用于验证复用弹层的确认状态已重置。
  await cancel.press('Enter');
  await expect(dialog).toBeFocused();
  await dialogCancel.focus();
  await page.keyboard.press(dismissal === 'cancel' ? 'Enter' : 'Escape');
  await expect(dialog).toHaveCount(0);
  await expect(cancel).toBeFocused();
  await expect(input).toHaveValue('Keep this draft');
  await expect(fixture.getByTestId('steps-form-navigation')).toHaveText('1');
  await expect(fixture.getByTestId('steps-form-writes')).toHaveText('0');
  expect(warnings.filter(message => message.includes('derived_inert'))).toEqual([]);
  expect(errors).toEqual([]);
});
}

for (const control of ['switch-provider', 'switch-tenant']) {
  test(`StepsForm discards drafts after ${control}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?view=stepsform');
    const fixture = page.getByTestId('steps-form-fixture');
    await fixture.getByRole('button', { name: 'Add', exact: true }).click();
    const oldInput = fixture.getByRole('textbox', { name: 'Item name', exact: true });
    const original = await oldInput.elementHandle();
    await oldInput.fill('Old draft');
    await fixture.getByTestId(control).click();
    await expect(oldInput).toHaveCount(0);
    expect(await original?.evaluate(element => element.isConnected)).toBe(false);
    await fixture.getByRole('button', { name: 'Add', exact: true }).click();
    await fixture.getByRole('textbox', { name: 'Item name', exact: true }).fill('Current');
    await fixture.getByRole('button', { name: 'Next', exact: true }).click();
    await fixture.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(fixture.getByTestId('steps-form-payload')).toHaveText('{"rows":[{"name":"Current"}]}');
    await expect(fixture.getByTestId('steps-form-writes')).toHaveText('1');
    await expect(fixture.getByTestId('steps-form-provider')).toHaveText(control === 'switch-provider' ? 'second' : 'first');
    await expect(fixture.getByTestId('steps-form-navigation')).toHaveText('1');
    expect(errors).toEqual([]);
  });
}

for (const control of ['switch-provider', 'switch-tenant']) {
  for (const outcome of ['release-read', 'reject-read']) {
    test(`StepsForm ignores late edit ${outcome} after ${control}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/?view=stepsform&edit&hold');
      const fixture = page.getByTestId('steps-form-fixture');
      await expect(fixture.getByTestId('pending-reads')).toHaveText('1');
      await expect(fixture.getByTestId('read-count')).toHaveText('1');
      await fixture.getByTestId(control).click();
      const input = fixture.getByRole('textbox', { name: 'Item name', exact: true });
      await expect(input).toHaveValue(control === 'switch-provider' ? 'second first record 0' : 'first second record 0');
      await expect(fixture.getByTestId('read-count')).toHaveText('2');
      await input.fill('Current draft');
      const original = await input.elementHandle();
      await fixture.getByTestId(outcome).click();
      await input.focus();
      await expect(fixture.getByTestId('settled-reads')).toHaveText('1');
      await expect(fixture.getByTestId('pending-reads')).toHaveText('0');
      await expect(input).toHaveValue('Current draft');
      expect(await original?.evaluate(element => element.isConnected)).toBe(true);
      await expect(input).toBeFocused();
      await expect(fixture.getByRole('alert')).toHaveCount(0);
      await fixture.getByRole('button', { name: 'Next', exact: true }).click();
      await fixture.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(fixture.getByTestId('steps-form-payload')).toHaveText('{"rows":[{"name":"Current draft"}]}');
      await expect(fixture.getByTestId('steps-form-writes')).toHaveText('1');
      await expect(fixture.getByTestId('steps-form-navigation')).toHaveText('1');
      await expect(fixture.getByTestId('steps-form-provider')).toHaveText(control === 'switch-provider' ? 'second' : 'first');
      await expect(fixture).not.toContainText('PRIVATE_OLD_STEPS_READ');
      expect(errors).toEqual([]);
    });
  }
}

test('StepsForm keeps a dirty edit array through completed refetch', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=stepsform&edit');
  const fixture = page.getByTestId('steps-form-fixture');
  const input = fixture.getByRole('textbox', { name: 'Item name', exact: true });
  await expect(input).toHaveValue('first first record 0');
  await input.fill('Local');
  const original = await input.elementHandle();
  await fixture.getByTestId('refresh-read').click();
  await expect(fixture.getByTestId('pending-reads')).toHaveText('1');
  await expect(fixture.getByTestId('read-count')).toHaveText('2');
  await fixture.getByTestId('release-read').click();
  await expect(fixture.getByTestId('refresh-completions')).toHaveText('1');
  await expect(fixture.getByTestId('pending-reads')).toHaveText('0');
  await expect(input).toHaveValue('Local');
  expect(await original?.evaluate(element => element.isConnected)).toBe(true);
  await input.focus();
  await input.press('End');
  await page.keyboard.type(' draft');
  await expect(input).toHaveValue('Local draft');
  await expect(input).toBeFocused();
  await fixture.getByRole('button', { name: 'Next', exact: true }).click();
  await fixture.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(fixture.getByTestId('steps-form-payload')).toHaveText('{"rows":[{"name":"Local draft"}]}');
  await expect(fixture.getByTestId('steps-form-navigation')).toHaveText('1');
  expect(errors).toEqual([]);
});

for (const change of ['scope', 'provider'] as const) {
test(`AutoForm retires accepted rows after ${change} changes without remounting`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=autoform&compound=array');
  const form = page.getByTestId('autoform-fixture').locator('form').first();
  await form.getByRole('button', { name: 'Add', exact: true }).click();
  const title = form.getByRole('textbox', { name: /^Title/ });
  await title.click();
  await title.pressSequentially('Old draft', { delay: 20 });
  await expect(title).toHaveValue('Old draft');
  await expect(title).toBeFocused();
  const original = await title.elementHandle();
  if (!original) throw new Error('Missing initial row input');
  const instanceId = await form.getByRole('textbox', { name: /^Name/ }).getAttribute('id');
  await page.getByTestId(change === 'scope' ? 'switch-autoform-scope' : 'replace-autoform-provider').click();
  await expect.poll(() => original.evaluate(element => element.isConnected)).toBe(false);
  await expect(page.getByTestId('autoform-success-count')).toHaveText('0');
  await expect(title).toHaveCount(0);
  await form.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(form.getByRole('textbox', { name: /^Name/ })).toHaveAttribute('id', instanceId ?? '');
  await title.fill('New draft');
  await form.getByRole('textbox', { name: /^Name/ }).fill('New product');
  await form.getByRole('textbox', { name: /^Description/ }).fill('Current scope');
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  await expect.poll(async () => JSON.parse(await page.getByTestId('autoform-payload').innerText())).toEqual({
    rows: [{ title: 'New draft' }], name: 'New product', description: 'Current scope',
  });
  expect(errors).toEqual([]);
});
}

for (const change of ['scope', 'provider'] as const) {
for (const outcome of ['success', 'failure'] as const) {
test(`AutoForm ignores late edit reads after ${change} changes: ${outcome}`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=autoform&edit=1&hold=initial');
  const fixture = page.getByTestId('autoform-fixture');
  const forms = fixture.locator('form');
  await expect(page.getByTestId('autoform-pending-reads')).toHaveText('1');
  await page.getByTestId(change === 'scope' ? 'switch-autoform-scope' : 'replace-autoform-provider').click();
  await expect(forms).toHaveCount(2);
  for (const form of await forms.all()) {
    await expect(form.getByRole('textbox', { name: /^Name/ })).toHaveValue('New record');
    await expect(form.getByRole('textbox', { name: /^Description/ })).toHaveValue('New response');
  }
  await expect(page.getByTestId('autoform-read-count')).toHaveText('2');
  await expect(page.getByTestId('autoform-pending-reads')).toHaveText('1');
  const first = forms.first();
  await first.getByRole('textbox', { name: /^Name/ }).fill('Current draft');
  await page.getByTestId(outcome === 'success' ? 'release-autoform-read' : 'reject-autoform-read').click();
  await expect(page.getByTestId('autoform-pending-reads')).toHaveText('0');
  await expect(page.getByTestId('autoform-settled-reads')).toHaveText('1');
  await expect(first.getByRole('textbox', { name: /^Name/ })).toHaveValue('Current draft');
  await expect(forms.nth(1).getByRole('textbox', { name: /^Name/ })).toHaveValue('New record');
  await expect(fixture.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('PRIVATE_OLD_READ');
  await first.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  await expect.poll(async () => JSON.parse(await page.getByTestId('autoform-payload').innerText())).toEqual({
    name: 'Current draft', description: 'New response',
  });
  expect(errors).toEqual([]);
});
}
}

test('AutoForm keeps a dirty edit draft across same-scope refetch', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=autoform&edit=1&compound=array');
  const form = page.getByTestId('autoform-fixture').locator('form').first();
  const name = form.getByRole('textbox', { name: /^Name/ });
  const description = form.getByRole('textbox', { name: /^Description/ });
  await expect(name).toHaveValue('Old record');
  const title = form.getByRole('textbox', { name: /^Title/ });
  await expect(title).toHaveValue('Server row 0');
  await title.fill('');
  await title.pressSequentially('Local row', { delay: 20 });
  await expect(title).toBeFocused();
  const originalRow = await title.elementHandle();
  if (!originalRow) throw new Error('Missing dirty row input');
  await name.fill('Unsaved draft');
  await description.fill('Unsaved description');
  await page.getByTestId('refresh-autoform-read').click();
  await expect(page.getByTestId('autoform-pending-reads')).toHaveText('1');
  await page.getByTestId('release-autoform-read').click();
  await expect(page.getByTestId('autoform-pending-reads')).toHaveText('0');
  await expect(page.getByTestId('autoform-settled-reads')).toHaveText('1');
  await expect(page.getByTestId('autoform-read-count')).toHaveText('2');
  await expect(page.getByTestId('autoform-refresh-completions')).toHaveText('1');
  expect(await originalRow.evaluate(element => element.isConnected)).toBe(true);
  await expect(title).toHaveValue('Local row');
  await expect(name).toHaveValue('Unsaved draft');
  await expect(description).toHaveValue('Unsaved description');
  await expect(page.getByTestId('autoform-success-count')).toHaveText('0');
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  await expect.poll(async () => JSON.parse(await page.getByTestId('autoform-payload').innerText())).toEqual({
    rows: [{ title: 'Local row' }], name: 'Unsaved draft', description: 'Unsaved description',
  });
  expect(errors).toEqual([]);
});

test('typed defaults, enum edits, required clear and retry', async ({ page }) => {
  await page.goto('/');
  const form = page.getByTestId('json-schema-form');
  await form.locator('[name="plan"]').selectOption({ value: '1' });
  await expect(form.locator('[name="plan"]')).toHaveValue('1');
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByTestId('form-result')).toHaveText('{"amount":0,"enabled":false,"plan":2}');
  await form.locator('[name="amount"]').fill('');
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(form.locator('[name="amount"]')).toHaveAttribute('aria-invalid', 'true');
  await form.locator('[name="amount"]').fill('12');
  await page.getByRole('button', { name: 'Fail next submit', exact: true }).click();
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(form.getByRole('alert')).toBeVisible();
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByTestId('form-result')).toHaveText('{"amount":12,"enabled":false,"plan":2}');
});
for (const kind of ['field', 'object', 'array', 'row-field'] as const) {
test(`conditional schema fields hide safely and require correction when restored: ${kind}`, async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`/?view=schema-conditional&condition=${kind}`);
  const form = page.getByTestId('json-schema-form');
  const mode = form.locator('[name="mode"]');
  const amount = form.getByLabel(/^Amount/);
  const expectValidAssociations = async () => {
    expect(await form.evaluate(element => {
      const ids = [...element.querySelectorAll<HTMLElement>('[id]')].map(node => node.id);
      const dangling = [...element.querySelectorAll('[aria-describedby]')].flatMap(node =>
        (node.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(id =>
          !id || !element.contains(document.getElementById(id))));
      return { unique: new Set(ids).size === ids.length, dangling };
    })).toEqual({ unique: true, dangling: [] });
  };
  await expect(amount).toHaveAccessibleDescription('Enter a numeric amount.');
  await expect(form.getByRole('group', {
    name: ['array', 'row-field'].includes(kind) ? 'details 1' : 'Advanced details', exact: true,
  }))
    .toHaveAccessibleDescription('Amounts for this configuration.');
  if (['array', 'row-field'].includes(kind)) {
    await expect(form.getByRole('group', { name: 'details', exact: true }))
      .toHaveAccessibleDescription('Configured amount rows.');
  }
  await expectValidAssociations();
  await amount.fill('');
  await amount.pressSequentially('1e');
  await expect.poll(() => amount.evaluate(element => (element as HTMLInputElement).validity.badInput)).toBe(true);
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(form.getByRole('alert')).toBeVisible();
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  const errorDescription = await amount.evaluate(element => {
    const ids = (element.getAttribute('aria-describedby') ?? '').split(/\s+/);
    return { count: ids.length, error: document.getElementById(ids[1] ?? '')?.textContent ?? '' };
  });
  expect(errorDescription.count).toBe(2);
  expect(errorDescription.error.length).toBeGreaterThan(0);
  await expect(amount).toHaveAccessibleDescription(`Enter a numeric amount. ${errorDescription.error}`);
  await expectValidAssociations();
  await expect(page.getByTestId('form-submissions')).toHaveText('0');
  await mode.selectOption({ label: 'basic' });
  await expect(form.getByLabel(/^Amount/)).toHaveCount(0);
  await expectValidAssociations();
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  const hiddenPayload = kind === 'field' ? { mode: 'basic', details: {} }
    : kind === 'row-field' ? { mode: 'basic', details: [{}] } : { mode: 'basic' };
  await expect(page.getByTestId('form-result')).toHaveText(JSON.stringify(hiddenPayload));
  await expect(page.getByTestId('form-submissions')).toHaveText('1');
  await expect(form.getByRole('alert')).toHaveCount(0);
  await mode.selectOption({ label: 'advanced' });
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(form.getByRole('alert')).toBeVisible();
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  await expect(amount).toBeFocused();
  await expect(amount).toHaveAccessibleDescription(`Enter a numeric amount. ${errorDescription.error}`);
  await expectValidAssociations();
  await expect(page.getByTestId('form-submissions')).toHaveText('1');
  await expect(page.getByTestId('form-result')).toHaveText(JSON.stringify(hiddenPayload));
  await mkdir('../../../output/playwright/schema-conditional', { recursive: true });
  await page.getByRole('region', { name: 'Schema form', exact: true }).screenshot({
    path: `../../../output/playwright/schema-conditional/${testInfo.project.name}-${kind}-restored-error.png`,
  });
  await amount.fill('12');
  await form.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByTestId('form-result')).toHaveText(JSON.stringify({
    mode: 'advanced', details: ['array', 'row-field'].includes(kind)
      ? [{ 'amount/~net': 12 }] : { 'amount/~net': 12 },
  }));
  await expect(page.getByTestId('form-submissions')).toHaveText('2');
  await expect(form.getByRole('alert')).toHaveCount(0);
  await expect(amount).toHaveAccessibleDescription('Enter a numeric amount.');
  await expect(amount).not.toHaveAttribute('aria-invalid', 'true');
  await expectValidAssociations();
  expect(errors).toEqual([]);
});
}
test('FilterBuilder associates nested scalar and range errors until typed queries are repaired', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const builder = page.getByTestId('filter-builder');
  const amount = builder.getByTestId('filter-builder-rule').nth(1);
  const plan = builder.getByTestId('filter-builder-rule').nth(2);
  const apply = builder.getByTestId('filter-builder-apply');
  const result = page.getByTestId('query-result');
  const scalar = amount.getByRole('spinbutton', { name: 'Value', exact: true });
  await scalar.fill('');
  await apply.press('Enter');
  await expect(scalar).toHaveAttribute('aria-invalid', 'true');
  await expect(scalar).toHaveAccessibleDescription(/Enter a valid typed value/);
  await expect(result).toHaveText('No applied query');
  await scalar.fill('0');
  await expect(scalar).not.toHaveAttribute('aria-describedby');
  await expect(builder.getByRole('alert')).toHaveCount(0);

  await amount.getByLabel('Operator', { exact: true }).selectOption('between');
  const lower = amount.getByRole('spinbutton', { name: 'Lower bound' });
  const upper = amount.getByRole('spinbutton', { name: 'Upper bound' });
  const group = amount.getByRole('group', { name: 'Value', exact: true });
  const planValue = plan.getByLabel('Value', { exact: true });
  await planValue.selectOption('');
  await apply.press('Enter');
  const amountId = await amount.getAttribute('data-filter-rule');
  const planId = await plan.getAttribute('data-filter-rule');
  expect(amountId).not.toBeNull();
  expect(planId).not.toBeNull();
  const rangeError = `${amountId}: Enter a valid typed value`;
  const planError = `${planId}: Enter a valid typed value`;
  for (const control of [lower, upper]) {
    await expect(control).toHaveAttribute('aria-invalid', 'true');
    await expect(control).toHaveAccessibleDescription(rangeError);
  }
  await expect(group).toHaveAccessibleDescription(rangeError);
  await expect(planValue).toHaveAccessibleDescription(planError);
  const oldPlanReference = await planValue.getAttribute('aria-describedby');
  await expect(result).toHaveText('No applied query');
  await lower.fill('0');
  await upper.fill('20');
  for (const control of [lower, upper, group]) {
    await expect(control).not.toHaveAttribute('aria-describedby');
  }
  await expect(planValue).toHaveAccessibleDescription(planError);
  expect(oldPlanReference).toBeTruthy();
  await expect(planValue).not.toHaveAttribute('aria-describedby', oldPlanReference ?? '');
  await apply.press('Enter');
  await expect(result).toHaveText('No applied query');
  await planValue.selectOption({ label: 'Two' });
  await expect(builder.getByRole('alert')).toHaveCount(0);
  await expect(planValue).not.toHaveAttribute('aria-describedby');
  await apply.press('Enter');
  await expect(result).toHaveText(JSON.stringify([
    { field: 'title', operator: 'contains', value: 'Svelte' },
    { operator: 'or', value: [
      { field: 'amount', operator: 'between', value: [0, 20] },
      { operator: 'and', value: [{ field: 'plan', operator: 'eq', value: 2 }] },
    ] },
  ]));
  await builder.screenshot({ path: testInfo.outputPath('filter-feedback-recovered.png') });
  expect(errors).toEqual([]);
});

test('nested editing preserves grouping and blocks partial queries', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-filter-rule]').nth(1).locator('input').fill('10');
  await page.getByTestId('filter-builder-apply').click();
  const result = JSON.parse(await page.getByTestId('query-result').innerText());
  expect(result).toEqual([{ field: 'title', operator: 'contains', value: 'Svelte' }, { operator: 'or', value: [
    { field: 'amount', operator: 'gte', value: 10 }, { operator: 'and', value: [{ field: 'plan', operator: 'eq', value: 1 }] },
  ] }]);
  await page.getByTestId('filter-builder-add-rule').click();
  await page.getByTestId('filter-builder-apply').click();
  await expect(page.getByTestId('filter-builder-errors')).toBeVisible();
  expect(JSON.parse(await page.getByTestId('query-result').innerText())).toEqual(result);
  await page.getByTestId('filter-builder-reset').click();
  await page.getByTestId('filter-builder-apply').click();
  await expect(page.getByTestId('query-result')).toHaveText('[]');
});
test('formula updates and errors work under a CSP without unsafe-eval', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto('/');
  const csp = response?.headers()['content-security-policy'];
  expect(csp).toContain("script-src 'self'");
  expect(csp).not.toContain('unsafe-eval');
  await expect(page.getByRole('textbox', { name: 'D1', exact: true })).toHaveValue('#CYCLE!');
  await page.getByRole('textbox', { name: 'A1', exact: true }).click();
  await page.getByRole('textbox', { name: 'Cell value or formula', exact: true }).fill('12');
  await expect(page.getByRole('textbox', { name: 'B1', exact: true })).toHaveValue('24');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  await expect(page.getByTestId('csv-result')).toContainText('0.3333333333333333');
  await expect(page.getByTestId('csv-result')).toContainText("'@SUM(1,2)");
  expect(errors).toEqual([]);
});
test('readonly state blocks editing and schema errors disable submission', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Toggle readonly', exact: true }).click();
  await expect(page.getByTestId('filter-builder-apply')).toBeDisabled();
  await expect(page.getByTestId('json-schema-form').locator('[name="amount"]')).toBeDisabled();
  await expect(page.getByRole('textbox', { name: 'Cell value or formula', exact: true })).toHaveAttribute('readonly', '');
  await page.getByRole('button', { name: 'Toggle readonly', exact: true }).click();
  await page.getByRole('button', { name: 'Invalid schema', exact: true }).click();
  await expect(page.getByTestId('schema-form-errors')).toBeVisible();
  await expect(page.getByTestId('json-schema-form').getByRole('button', { name: 'Submit', exact: true })).toBeDisabled();
});

// 真实 Tab 遍历：跳过可滚动容器等浏览器额外焦点停靠点，仍由键盘操作目标控件。
// WebKit 在宿主未开启全键盘访问时用 Alt+Tab 遍历全部控件，属于 Safari 的正常键盘方式。
async function tabToFocusedControl(page: Page, target: Locator, testInfo: TestInfo): Promise<void> {
  const traversalKey = testInfo.project.name.startsWith('webkit') && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.keyboard.press(traversalKey);
    if (await target.evaluate(element => element === document.activeElement)) return;
  }
  await expect(target).toBeFocused();
}

test('task details are keyboard reachable and row actions do not select the row', async ({ page }, testInfo) => {
  await page.goto('/');
  const task = page.getByRole('region', { name: 'Task list' });
  await expect(task).toBeVisible();
  const details = task.getByRole('button', { name: 'Details', exact: true });
  const cancel = task.getByRole('button', { name: 'Cancel', exact: true });
  await expect(details).toBeVisible();
  await expect(cancel).toBeVisible();
  await page.getByTestId('task-focus-start').focus();
  await tabToFocusedControl(page, cancel, testInfo);
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('task-cancellations')).toHaveText('1');
  await expect(page.getByTestId('task-selections')).toHaveText('0');
  await tabToFocusedControl(page, details, testInfo);
  await expect(details).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('selected-task')).toHaveText('task-1');
  await expect(page.getByTestId('task-selections')).toHaveText('1');
  await expect(page.getByTestId('task-form-submitted')).toHaveText('false');
});

test('task details and actions do not submit a surrounding form', async ({ page }) => {
  await page.goto('/');
  const task = page.getByRole('region', { name: 'Task list' });
  await task.getByRole('button', { name: 'Details', exact: true }).press('Space');
  await expect(page.getByTestId('selected-task')).toHaveText('task-1');
  await task.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByTestId('task-cancellations')).toHaveText('1');
  await expect(page.getByTestId('task-selections')).toHaveText('1');
  await expect(page.getByTestId('selected-task')).toHaveText('task-1');
  await expect(page.getByTestId('task-form-submitted')).toHaveText('false');
});

test('task title remains keyboard reachable with the actions column hidden', async ({ page }, testInfo) => {
  await page.goto('/');
  const task = page.getByRole('region', { name: 'Task list' });
  await task.getByRole('checkbox', { name: 'Show task actions' }).uncheck();
  const title = task.getByRole('button', { name: 'Generate report', exact: true });
  await expect(title).toBeVisible();
  await page.getByTestId('task-focus-start').focus();
  await tabToFocusedControl(page, title, testInfo);
  await expect(title).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('task-selections')).toHaveText('1');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('task-selections')).toHaveText('2');
  await expect(page.getByTestId('task-form-submitted')).toHaveText('false');
  await mkdir('../../../output/playwright/task-list', { recursive: true });
  await task.screenshot({ path: `../../../output/playwright/task-list/${testInfo.project.name}.png` });
});

test('task table remains inspectable through horizontal scrolling on narrow screens', async ({ page }, testInfo) => {
  await page.goto('/');
  const task = page.getByRole('region', { name: 'Task list' });
  const tableWrap = task.locator('[data-slot="table-container"]');
  await expect(tableWrap).toBeVisible();
  const dimensions = await tableWrap.evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  if (await page.evaluate(() => window.innerWidth < 600)) {
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
  }
  await tableWrap.evaluate(element => { element.scrollLeft = element.scrollWidth; });
  await expect(tableWrap).toHaveJSProperty('scrollLeft', dimensions.scrollWidth - dimensions.clientWidth);
  const details = task.getByRole('button', { name: 'Details', exact: true });
  const containerBounds = await tableWrap.boundingBox();
  const buttonBounds = await details.boundingBox();
  expect(containerBounds).not.toBeNull();
  expect(buttonBounds).not.toBeNull();
  if (containerBounds && buttonBounds) {
    expect(buttonBounds.x).toBeGreaterThanOrEqual(containerBounds.x);
    expect(buttonBounds.x + buttonBounds.width).toBeLessThanOrEqual(containerBounds.x + containerBounds.width + 1);
  }
  await details.click();
  await expect(page.getByTestId('task-selections')).toHaveText('1');
  await mkdir('../../../output/playwright/task-list', { recursive: true });
  await task.screenshot({ path: `../../../output/playwright/task-list/${testInfo.project.name}-scrolled.png` });
});

test('task action failures are visible, sanitized, and retryable', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const task = page.getByRole('region', { name: 'Task list' });
  await mkdir('../../../output/playwright/task-list', { recursive: true });
  await task.getByTestId('fail-task-cancel').click();
  await task.getByRole('button', { name: 'Cancel', exact: true }).click();
  const alert = task.getByRole('alert');
  await expect(alert).toContainText('Unable to confirm the task action');
  await expect(task).not.toContainText('PRIVATE_TASK_ACTION_FIXTURE');
  await expect(task.getByTestId('task-cancellations')).toHaveText('0');
  await expect(task.getByTestId('task-selections')).toHaveText('0');
  await expect(task.getByTestId('task-form-submitted')).toHaveText('false');
  const cancel = task.getByRole('button', { name: 'Cancel', exact: true });
  const describedBy = await cancel.getAttribute('aria-describedby');
  expect(describedBy).toBeTruthy();
  await expect(alert).toHaveAttribute('id', describedBy!);
  await alert.scrollIntoViewIfNeeded();
  await expect(alert).toBeVisible();
  await task.screenshot({ path: `../../../output/playwright/task-list/${testInfo.project.name}-action-failed.png` });
  const alertBounds = await alert.boundingBox();
  const taskBounds = await task.boundingBox();
  expect(alertBounds).not.toBeNull();
  expect(taskBounds).not.toBeNull();
  if (alertBounds && taskBounds) {
    expect(alertBounds.x).toBeGreaterThanOrEqual(taskBounds.x);
    expect(alertBounds.x + alertBounds.width).toBeLessThanOrEqual(taskBounds.x + taskBounds.width + 1);
    expect(alertBounds.y + alertBounds.height).toBeLessThanOrEqual(taskBounds.y + taskBounds.height + 1);
  }
  await cancel.click();
  await expect(alert).toBeHidden();
  await expect(cancel).not.toHaveAttribute('aria-describedby');
  await expect(task.getByTestId('task-cancellations')).toHaveText('1');
  await expect(task.getByTestId('task-selections')).toHaveText('0');
  await expect(task.getByTestId('task-form-submitted')).toHaveText('false');
  await task.screenshot({ path: `../../../output/playwright/task-list/${testInfo.project.name}-action-recovered.png` });
  expect(errors).toEqual([]);
});

test('task retry failures are visible, sanitized, and recoverable', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const task = page.getByRole('region', { name: 'Task list' });
  await mkdir('../../../output/playwright/task-list', { recursive: true });
  await task.getByTestId('show-retry-task').click();
  const retryRow = task.getByRole('row').filter({ hasText: 'Retry report' });
  const retry = retryRow.getByRole('button', { name: 'Retry', exact: true });
  await expect(retry).toBeVisible();
  await task.getByTestId('fail-task-retry').click();
  await retry.click();
  const alert = retryRow.getByRole('alert');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText('Unable to confirm the task action');
  await expect(retryRow).not.toContainText('PRIVATE_TASK_RETRY_FIXTURE');
  await expect(task.getByTestId('task-retries')).toHaveText('0');
  await expect(task.getByTestId('task-selections')).toHaveText('0');
  await expect(task.getByTestId('task-form-submitted')).toHaveText('false');
  const describedBy = await retry.getAttribute('aria-describedby');
  expect(describedBy).toBeTruthy();
  await expect(alert).toHaveAttribute('id', describedBy!);
  await alert.scrollIntoViewIfNeeded();
  await expect(alert).toBeInViewport();
  const alertBounds = await alert.boundingBox();
  const tableBounds = await task.locator('[data-slot="table-container"]').boundingBox();
  expect(alertBounds).not.toBeNull();
  expect(tableBounds).not.toBeNull();
  if (alertBounds && tableBounds) {
    expect(alertBounds.x).toBeGreaterThanOrEqual(tableBounds.x);
    expect(alertBounds.x + alertBounds.width).toBeLessThanOrEqual(tableBounds.x + tableBounds.width + 1);
    expect(alertBounds.y + alertBounds.height).toBeLessThanOrEqual(tableBounds.y + tableBounds.height + 1);
  }
  await task.screenshot({ path: `../../../output/playwright/task-list/${testInfo.project.name}-retry-failed.png` });
  await retry.click();
  await expect(alert).toBeHidden();
  await expect(retry).not.toHaveAttribute('aria-describedby');
  await expect(task.getByTestId('task-retries')).toHaveText('1');
  await expect(task.getByTestId('task-selections')).toHaveText('0');
  await expect(task.getByTestId('task-form-submitted')).toHaveText('false');
  await task.screenshot({ path: `../../../output/playwright/task-list/${testInfo.project.name}-retry-recovered.png` });
  expect(errors).toEqual([]);
});
test('enterprise connection tests share a pending lock and recover after failure', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=enterprise');
  const settings = page.getByTestId('enterprise-page');
  const controls = page.getByRole('complementary', { name: 'Fixture controls' });
  const tests = settings.getByRole('button', { name: 'Test', exact: true });
  await expect(tests).toHaveCount(3);
  await expect(settings.getByRole('button', { name: /^(Manage|Connect)$/ })).toHaveCount(0);
  await tests.nth(2).click();
  await expect(controls.getByTestId('connection-target')).toHaveText('saml');
  await expect(controls.getByTestId('connection-calls')).toHaveText('1');
  await expect(settings.getByRole('button', { name: 'Testing...', exact: true })).toBeDisabled();
  await expect(tests.nth(0)).toBeDisabled();
  await expect(tests.nth(1)).toBeDisabled();
  await mkdir('../../../output/playwright/enterprise-settings', { recursive: true });
  await page.screenshot({ path: `../../../output/playwright/enterprise-settings/${testInfo.project.name}-pending.png`, fullPage: true });
  await controls.getByRole('button', { name: 'Fail test', exact: true }).click();
  await expect(controls.getByRole('status')).toHaveText('Operation failed');
  await expect(tests).toHaveCount(3);
  for (const button of await tests.all()) await expect(button).toBeEnabled();
  await tests.nth(1).focus();
  await page.keyboard.press('Enter');
  await expect(controls.getByTestId('connection-target')).toHaveText('oidc');
  await expect(controls.getByTestId('connection-calls')).toHaveText('2');
  await controls.getByRole('button', { name: 'Complete test', exact: true }).click();
  await expect(controls.getByRole('status')).toHaveText('Identity provider connection succeeded');
  for (const button of await tests.all()) await expect(button).toBeEnabled();
  await page.screenshot({ path: `../../../output/playwright/enterprise-settings/${testInfo.project.name}-recovered.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('enterprise settings retries reads and preserves policy and organization drafts', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=enterprise&fail-load&fail-policy&fail-organization');
  const settings = page.getByTestId('enterprise-page');
  const controls = page.getByRole('complementary', { name: 'Fixture controls' });
  await expect(settings.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expect(settings).not.toContainText('No identity provider configured');
  await expect(page.locator('body')).not.toContainText('PRIVATE_ENTERPRISE_READ_FIXTURE');
  await settings.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(controls.getByTestId('settings-loads')).toHaveText('2');
  const timeout = settings.getByLabel('Session Timeout (minutes)', { exact: true });
  const organization = settings.getByLabel('Organization name', { exact: true });
  const organizationSave = settings.getByRole('button', { name: 'Save', exact: true }).nth(0);
  const policySave = settings.getByRole('button', { name: 'Save', exact: true }).nth(1);
  await expect(timeout).toHaveValue('30');
  await expect(organization).toHaveValue('Northwind Research');
  await timeout.fill('45');
  await policySave.click();
  await expect(controls.getByRole('status')).toHaveText('Operation failed');
  await expect(timeout).toHaveValue('45');
  await expect(controls.getByTestId('policy-saves')).toHaveText('1');
  await expect(controls.getByTestId('saved-policy')).toHaveText('null');
  await expect(page.locator('body')).not.toContainText('PRIVATE_ENTERPRISE_POLICY_FIXTURE');
  await policySave.click();
  await expect(controls.getByRole('status')).toHaveText('Enterprise policy saved');
  await expect(controls.getByTestId('policy-saves')).toHaveText('2');
  await expect(controls.getByTestId('saved-policy')).toHaveText(JSON.stringify({
    sessionTimeoutMinutes: 45, auditRetentionDays: 365, auditLoggingEnabled: true, requireSso: false,
  }));
  await organization.fill('Northwind Operations');
  await organizationSave.click();
  await expect(controls.getByRole('status')).toHaveText('Operation failed');
  await expect(organization).toHaveValue('Northwind Operations');
  await expect(controls.getByTestId('organization-saves')).toHaveText('1');
  await expect(controls.getByTestId('saved-organization')).toHaveText('null');
  await expect(page.locator('body')).not.toContainText('PRIVATE_ENTERPRISE_ORGANIZATION_FIXTURE');
  await mkdir('../../../output/playwright/enterprise-settings', { recursive: true });
  await page.screenshot({ path: `../../../output/playwright/enterprise-settings/${testInfo.project.name}-save-failed.png`, fullPage: true });
  await organizationSave.click();
  await expect(controls.getByRole('status')).toHaveText('Organization saved');
  await expect(organization).toHaveValue('Northwind Operations');
  await expect(controls.getByTestId('organization-saves')).toHaveText('2');
  await expect(controls.getByTestId('saved-organization')).toHaveText('{"name":"Northwind Operations"}');
  await expect(organizationSave).toBeDisabled();
  expect(errors).toEqual([]);
});

test('API settings preserve creation drafts and revoked records on failure', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=api');
  const api = page.getByTestId('api-page');
  const controls = page.getByRole('complementary', { name: 'Fixture controls' });
  await mkdir('../../../output/playwright/api-settings', { recursive: true });
  await expect(api.getByText('Existing key')).toBeVisible();
  await api.getByPlaceholder('CI deployment token').fill('Automation key');
  await controls.getByRole('button', { name: 'Fail next create', exact: true }).click();
  await api.getByRole('button', { name: 'Generate Token', exact: true }).click();
  await expect(controls.getByRole('status')).toHaveText('Operation failed');
  await expect(api.getByPlaceholder('CI deployment token')).toHaveValue('Automation key');
  await expect(page.locator('body')).not.toContainText('PRIVATE_API_CREATE_FIXTURE');
  await page.screenshot({ path: `../../../output/playwright/api-settings/${testInfo.project.name}-create-failed.png`, fullPage: true });
  await api.getByRole('button', { name: 'Generate Token', exact: true }).click();
  await expect(api.locator('input[readonly]')).toHaveValue('sv_live_one_time_secret');

  const existingKey = api.getByText('Existing key');
  await controls.getByRole('button', { name: 'Fail next revoke', exact: true }).click();
  await api.getByRole('button', { name: 'Delete Existing key', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(controls.getByRole('status')).toHaveText('Operation failed');
  await expect(existingKey).toBeVisible();
  await expect(page.locator('body')).not.toContainText('PRIVATE_API_REVOKE_FIXTURE');
  await page.screenshot({ path: `../../../output/playwright/api-settings/${testInfo.project.name}-revoke-failed.png`, fullPage: true });
  await api.getByRole('button', { name: 'Delete Existing key', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(existingKey).toBeHidden();
  await mkdir('../../../output/playwright/api-settings', { recursive: true });
  await api.screenshot({ path: `../../../output/playwright/api-settings/${testInfo.project.name}-recovered.png` });
  expect(errors).toEqual([]);
});

test('API settings retry restores the primary content after a read failure', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=api&fail-load');
  const api = page.getByTestId('api-page');
  await mkdir('../../../output/playwright/api-settings', { recursive: true });
  await expect(api.getByRole('alert')).toContainText('Operation failed');
  await expect(api.getByRole('alert')).toHaveCount(1);
  await expect(page.locator('body')).not.toContainText('PRIVATE_API_READ_FIXTURE');
  await expect(api).not.toContainText('Existing key');
  await expect(api.getByRole('button', { name: 'Add Webhook', exact: true })).toHaveCount(0);
  await expect(api.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await page.screenshot({ path: `../../../output/playwright/api-settings/${testInfo.project.name}-read-failed.png`, fullPage: true });
  await api.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(api.getByText('Existing key')).toBeVisible();
  await expect(api.getByRole('alert')).toHaveCount(0);
  await expect(api.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  await mkdir('../../../output/playwright/api-settings', { recursive: true });
  await api.screenshot({ path: `../../../output/playwright/api-settings/${testInfo.project.name}-load-recovered.png` });
  expect(errors).toEqual([]);
});

test('Security settings preserve password input and sessions across failures', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=security');
  const security = page.getByTestId('security-page');
  const controls = page.getByRole('complementary', { name: 'Fixture controls' });
  await mkdir('../../../output/playwright/security-settings', { recursive: true });
  await expect(security.getByText('Windows - Edge')).toBeVisible();
  await security.getByLabel('Current Password').fill('old-password');
  await security.getByLabel('New Password').fill('New-password-123');
  await security.getByLabel('Confirm Password').fill('New-password-123');
  await controls.getByRole('button', { name: 'Fail next password', exact: true }).click();
  await security.getByRole('button', { name: 'Update Password', exact: true }).click();
  await expect(security.getByRole('alert')).toContainText('Operation failed');
  await expect(security.getByLabel('Current Password')).toHaveValue('old-password');
  await expect(security.getByLabel('New Password')).toHaveValue('New-password-123');
  await expect(security.getByLabel('Confirm Password')).toHaveValue('New-password-123');
  await expect(controls.getByRole('status')).toHaveText('');
  await expect(page.locator('body')).not.toContainText('PRIVATE_SECURITY_PASSWORD_FIXTURE');
  await page.screenshot({ path: `../../../output/playwright/security-settings/${testInfo.project.name}-password-failed.png`, fullPage: true });
  await security.getByRole('button', { name: 'Update Password', exact: true }).click();
  await expect(controls.getByRole('status')).toHaveText('Password updated successfully');
  await expect(security.getByLabel('Current Password')).toHaveValue('');
  await expect(security.getByLabel('New Password')).toHaveValue('');
  await expect(security.getByLabel('Confirm Password')).toHaveValue('');
  await expect(security.getByRole('alert')).toHaveCount(0);

  const revoke = security.getByTitle('Sign out device');
  await controls.getByRole('button', { name: 'Fail next revoke', exact: true }).click();
  await revoke.click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(security.getByText('Windows - Edge')).toBeVisible();
  await expect(controls.getByTestId('revoke-calls')).toHaveText('0');
  await revoke.click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(controls.getByRole('status')).toHaveText('Operation failed');
  await expect(controls.getByTestId('revoke-calls')).toHaveText('1');
  await expect(security.getByText('Windows - Edge')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('PRIVATE_SECURITY_REVOKE_FIXTURE');
  await page.screenshot({ path: `../../../output/playwright/security-settings/${testInfo.project.name}-revoke-failed.png`, fullPage: true });
  await revoke.click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(security.getByText('Windows - Edge')).toBeHidden();
  await expect(security.getByText('macOS - Safari')).toBeVisible();
  await expect(controls.getByTestId('revoke-calls')).toHaveText('2');
  await mkdir('../../../output/playwright/security-settings', { recursive: true });
  await security.screenshot({ path: `../../../output/playwright/security-settings/${testInfo.project.name}-recovered.png` });
  expect(errors).toEqual([]);
});

test('Security settings retry restores sessions after a read failure', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=security&fail-load');
  const security = page.getByTestId('security-page');
  await expect(security.getByRole('alert')).toContainText('Operation failed');
  await expect(security.getByText('Two-factor authentication status is currently unavailable.')).toBeVisible();
  await expect(security.getByRole('switch')).toBeDisabled();
  await expect(security).not.toContainText('2FA is currently disabled.');
  await expect(page.locator('body')).not.toContainText('PRIVATE_SECURITY_READ_FIXTURE');
  await expect(security).not.toContainText('Windows - Edge');
  await expect(security.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await mkdir('../../../output/playwright/security-settings', { recursive: true });
  await page.screenshot({ path: `../../../output/playwright/security-settings/${testInfo.project.name}-read-failed.png`, fullPage: true });
  await security.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(security.getByText('Windows - Edge')).toBeVisible();
  await expect(security.getByRole('switch')).toBeEnabled();
  await expect(security.getByRole('switch')).toBeChecked();
  await expect(security.getByText('Two-factor authentication status is currently unavailable.')).toHaveCount(0);
  await expect(security.getByRole('alert')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Profile and MFA: profile failures preserve drafts and allow recovery', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mkdir('../../../output/playwright/profile-mfa', { recursive: true });
  await page.goto('/?view=profile');
  const profile = page.getByTestId('profile-page');
  const controls = page.getByRole('complementary', { name: 'Fixture controls' });
  await expect(profile.getByText('Ada Lovelace')).toBeVisible();
  await profile.getByRole('button', { name: 'Edit' }).click();
  await profile.getByLabel('Name').fill('Ada Byron Lovelace');
  await controls.getByRole('button', { name: 'Fail next profile', exact: true }).click();
  await profile.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(profile.getByText('Operation failed')).toBeVisible();
  await expect(profile.getByLabel('Name')).toHaveValue('Ada Byron Lovelace');
  await expect(page.locator('body')).not.toContainText('PRIVATE_PROFILE_FIXTURE');
  await profile.screenshot({ path: `../../../output/playwright/profile-mfa/${testInfo.project.name}-profile-failed.png` });
  await profile.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(profile.getByText('Ada Byron Lovelace')).toBeVisible();
  await expect(profile.getByText('Operation failed')).toHaveCount(0);

  await profile.getByLabel('Current Password').fill('old-password');
  await profile.getByLabel('Password', { exact: true }).fill('New-password-123');
  await profile.getByLabel('Confirm Password').fill('New-password-123');
  await controls.getByRole('button', { name: 'Fail next password', exact: true }).click();
  await profile.getByRole('button', { name: 'Update Password', exact: true }).click();
  await expect(profile.getByText('Operation failed')).toBeVisible();
  await expect(profile.getByLabel('Current Password')).toHaveValue('old-password');
  await expect(profile.getByLabel('Password', { exact: true })).toHaveValue('New-password-123');
  await expect(profile.getByLabel('Confirm Password')).toHaveValue('New-password-123');
  await expect(page.locator('body')).not.toContainText('PRIVATE_PASSWORD_FIXTURE');
  await profile.screenshot({ path: `../../../output/playwright/profile-mfa/${testInfo.project.name}-password-failed.png` });
  await profile.getByRole('button', { name: 'Update Password', exact: true }).click();
  await expect(profile.getByLabel('Current Password')).toHaveValue('');
  await expect(profile.getByLabel('Password', { exact: true })).toHaveValue('');
  await expect(profile.getByLabel('Confirm Password')).toHaveValue('');
  await mkdir('../../../output/playwright/profile-mfa', { recursive: true });
  await profile.screenshot({ path: `../../../output/playwright/profile-mfa/${testInfo.project.name}-profile-recovered.png` });
  expect(errors).toEqual([]);
});

test('Profile and MFA: enrollment failures preserve codes without revealing recovery data', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mkdir('../../../output/playwright/profile-mfa', { recursive: true });
  await page.goto('/?view=mfa');
  const mfa = page.getByTestId('mfa-page');
  const mfaControls = page.getByRole('complementary', { name: 'Fixture controls' });
  await mfaControls.getByRole('button', { name: 'Fail next begin', exact: true }).click();
  await mfa.getByRole('button', { name: 'Two-Factor Authentication Setup', exact: true }).click();
  await expect(mfa.getByRole('alert')).toContainText('Operation failed');
  await expect(mfa).not.toContainText('PRIVATE_MFA_BEGIN_FIXTURE');
  await expect(mfa).not.toContainText('JBSWY3DPEHPK3PXP');
  await expect(mfa).not.toContainText('recovery-2');
  await expect(mfa).not.toContainText('recovery-1');
  await expect(mfa.locator('code')).toHaveCount(0);
  await mfa.screenshot({ path: `../../../output/playwright/profile-mfa/${testInfo.project.name}-begin-failed.png` });
  await mfa.getByRole('button', { name: 'Two-Factor Authentication Setup', exact: true }).click();
  await expect(mfa.getByText('JBSWY3DPEHPK3PXP')).toBeVisible();
  await mfa.getByLabel('Enter Verification Code').fill('123456');
  await mfaControls.getByRole('button', { name: 'Fail next verify', exact: true }).click();
  await mfa.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(mfa.getByRole('alert')).toContainText('Operation failed');
  await expect(mfa.getByRole('alert')).toHaveCount(1);
  await expect(mfa).not.toContainText('recovery-2');
  await expect(mfa.getByLabel('Enter Verification Code')).toHaveValue('123456');
  await expect(page.locator('body')).not.toContainText('PRIVATE_MFA_VERIFY_FIXTURE');
  await expect(mfa).not.toContainText('recovery-1');
  await mfa.screenshot({ path: `../../../output/playwright/profile-mfa/${testInfo.project.name}-verify-failed.png` });
  await mfa.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(mfa.getByRole('status')).toContainText('Two-factor authentication is enabled');
  await expect(mfa).toContainText('recovery-1');
  await expect(mfa).toContainText('recovery-2');
  await expect(mfa.getByRole('alert')).toHaveCount(0);
  await expect(mfa.locator('code')).toHaveCount(0);
  await mkdir('../../../output/playwright/profile-mfa', { recursive: true });
  expect(errors).toEqual([]);
});

for (const view of ['profile', 'security', 'mfa'] as const) {
  test(`Auth field identity isolates ${view} labels in two instances`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/?view=${view}&instances=2`);
    const instances = page.getByTestId(`${view}-page`);
    await expect(instances).toHaveCount(2);
    for (const instance of await instances.all()) {
      if (view === 'profile') await instance.getByRole('button', { name: 'Edit', exact: true }).click();
      if (view === 'mfa') await instance.getByRole('button', { name: 'Two-Factor Authentication Setup', exact: true }).click();
    }
    const labels = view === 'profile'
      ? ['Name', 'Current Password', 'Password', 'Confirm Password']
      : view === 'security' ? ['Current Password', 'New Password', 'Confirm Password'] : ['Enter Verification Code'];
    const ids = new Set<string>();
    for (const instance of await instances.all()) {
      for (const text of labels) {
        const input = instance.getByLabel(text, { exact: true });
        await expect(input).toBeVisible();
        const id = await input.getAttribute('id');
        expect(id).toBeTruthy();
        expect(ids.has(id!)).toBe(false);
        ids.add(id!);
        await instance.locator('label').filter({ hasText: new RegExp(`^${text}$`) }).click();
        await expect(input).toBeFocused();
      }
    }
    const target = view === 'profile' ? 'Name' : view === 'security' ? 'Current Password' : 'Enter Verification Code';
    await instances.nth(1).getByLabel(target, { exact: true }).fill(view === 'mfa' ? '123456' : 'Second instance');
    await expect(instances.nth(0).getByLabel(target, { exact: true })).toHaveValue(view === 'profile' ? 'Ada Lovelace' : '');
    await mkdir('../../../output/playwright/auth-field-identity', { recursive: true });
    await instances.nth(1).screenshot({ path: `../../../output/playwright/auth-field-identity/${testInfo.project.name}-${view}.png` });
    expect(errors).toEqual([]);
  });
}

test('Notification settings keep one error owner and preserve save drafts', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=notifications&fail-load');
  const notifications = page.getByTestId('notifications-page');
  const controls = page.getByRole('complementary', { name: 'Fixture controls' });
  await expect(notifications.getByRole('alert')).toContainText('Operation failed');
  await expect(notifications.getByRole('alert')).toHaveCount(1);
  await expect(notifications.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expect(notifications.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await expect(notifications.getByRole('switch')).toHaveCount(0);
  await expect(notifications.getByText('Security Alerts')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('PRIVATE_NOTIFICATION_READ_FIXTURE');
  await mkdir('../../../output/playwright/notifications', { recursive: true });
  await page.screenshot({ path: `../../../output/playwright/notifications/${testInfo.project.name}-read-failed.png`, fullPage: true });
  await notifications.getByRole('button', { name: 'Retry', exact: true }).click();
  const email = notifications.locator('section').filter({ has: page.getByRole('heading', { name: 'Email Notifications', exact: true }) });
  const security = email.getByRole('switch', { name: 'Security Alerts', exact: true });
  await expect(security).toBeVisible();
  await expect(security).toBeChecked();
  await expect(notifications.getByRole('switch', { name: 'Critical Security Events', exact: true })).not.toBeChecked();
  await security.click();
  await controls.getByRole('button', { name: 'Fail next save', exact: true }).click();
  await notifications.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(notifications.getByText('Operation failed')).toBeVisible();
  await expect(security).not.toBeChecked();
  await expect(controls.getByRole('status')).toHaveText('');
  await expect(controls.getByTestId('saved-preferences')).toHaveText('null');
  await expect(page.locator('body')).not.toContainText('PRIVATE_NOTIFICATION_SAVE_FIXTURE');
  await page.screenshot({ path: `../../../output/playwright/notifications/${testInfo.project.name}-save-failed.png`, fullPage: true });
  await notifications.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(controls.getByRole('status')).toHaveText('Updated successfully');
  await expect(controls.getByTestId('saved-preferences')).toHaveText(JSON.stringify({
    email: { security: false, activity: false, reports: true },
    push: { security: true, activity: true, reports: false },
    sms: { security: false },
  }));
  await expect(security).not.toBeChecked();
  await expect(notifications.getByText('Operation failed')).toHaveCount(0);
  await page.screenshot({ path: `../../../output/playwright/notifications/${testInfo.project.name}-recovered.png`, fullPage: true });
  expect(errors).toEqual([]);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`states and screenshot ${viewport.width}x${viewport.height} ${theme}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto('/');
      await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), theme === 'dark');
      await expect(page.getByTestId('filter-builder')).toBeVisible();
      await expect(page.getByTestId('json-schema-form')).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'B1', exact: true })).toHaveValue('4');
      await page.evaluate(() => document.fonts.ready);
      await mkdir(screenshots, { recursive: true });
      await page.screenshot({ path: path.join(screenshots, `ready-${viewport.width}x${viewport.height}-${theme}.png`), fullPage: true });
      await page.getByTestId('filter-builder-add-rule').click();
      await page.getByTestId('filter-builder-apply').click();
      await expect(page.getByTestId('filter-builder-errors')).toBeVisible();
      await page.screenshot({ path: path.join(screenshots, `invalid-${viewport.width}x${viewport.height}-${theme}.png`), fullPage: true });
    });
  }
}

test('AutoForm tags keeps draft focus, keyboard summary return and live help links isolated', async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=autoform&compound=tags');
  const fixture = page.getByTestId('autoform-fixture');
  const forms = fixture.locator('form');
  await expect(forms).toHaveCount(2);
  const backward = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Shift+Tab' : 'Shift+Tab';
  const forward = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
  const resolveLinks = (form: ReturnType<typeof forms.nth>) => form.evaluate((element) => {
    const control = element.querySelector<HTMLElement>('input[aria-label="Tags"]');
    const tokens = (control?.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    return {
      tokens,
      ariaInvalid: control?.getAttribute('aria-invalid'),
      resolved: tokens.map(id => {
        const node = document.getElementById(id);
        return {
          id,
          connected: node?.isConnected === true,
          inForm: node !== null && element.contains(node),
          text: node?.textContent ?? '',
        };
      }),
    };
  });
  const describedIds: string[][] = [];
  for (const form of await forms.all()) {
    const tags = form.getByRole('textbox', { name: 'Tags', exact: true });
    await expect(tags).toHaveAccessibleDescription('Choose product tags.');
    const initial = await resolveLinks(form);
    expect(initial.tokens).toHaveLength(1);
    expect(initial.resolved[0]?.connected).toBe(true);
    expect(initial.resolved[0]?.inForm).toBe(true);
    expect(initial.resolved[0]?.text).toBe('Choose product tags.');
    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(tags).toBeFocused();
    await expect(tags).toHaveAttribute('aria-invalid', 'true');
    await expect(form.locator('[aria-invalid="true"]')).toHaveCount(3);
    await expect(tags).toHaveAccessibleDescription('Choose product tags. This field is required');
    const summary = form.getByRole('region', { name: 'Please fix the following errors' });
    await expect(summary.getByRole('button')).toHaveCount(3);
    const tagEntry = summary.getByRole('button', { name: /^Tags:/ });
    await expect(tagEntry).toHaveText('Tags: This field is required');
    const invalid = await resolveLinks(form);
    expect(invalid.tokens).toHaveLength(2);
    expect(invalid.tokens[0]).toBe(initial.tokens[0]);
    expect(invalid.tokens[1]).not.toBe(initial.tokens[0]);
    expect(invalid.resolved.every(node => node.connected && node.inForm)).toBe(true);
    expect(invalid.resolved[0]?.text).toBe('Choose product tags.');
    expect(invalid.resolved[1]?.text).toBe('This field is required');
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(tagEntry).toBeFocused();
    await page.keyboard.press(forward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(forward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(forward);
    await expect(tags).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(tagEntry).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(tags).toBeFocused();
    describedIds.push(invalid.tokens);
  }
  expect(describedIds).toHaveLength(2);
  expect(describedIds[0]?.some(id => describedIds[1]?.includes(id))).toBe(false);
  await expect(page.getByTestId('autoform-success-count')).toHaveText('0');
  const first = forms.nth(0);
  const firstTags = first.getByRole('textbox', { name: 'Tags', exact: true });
  await firstTags.pressSequentially('alpha', { delay: 25 });
  await page.keyboard.press('Enter');
  await firstTags.pressSequentially('beta', { delay: 25 });
  await page.keyboard.press('Enter');
  await expect(firstTags).toHaveValue('');
  await expect(firstTags).toBeFocused();
  await expect.poll(() => first.locator('input[name="tags[]"]').evaluateAll(nodes =>
    nodes.map(node => (node as HTMLInputElement).value))).toEqual(['alpha', 'beta']);
  await expect(firstTags).not.toHaveAttribute('aria-invalid', 'true');
  await expect(first.locator('[aria-invalid="true"]')).toHaveCount(2);
  await expect(firstTags).toHaveAccessibleDescription('Choose product tags.');
  const corrected = await resolveLinks(first);
  expect(corrected.tokens).toEqual([describedIds[0]?.[0]]);
  expect(corrected.resolved.every(node => node.connected && node.inForm)).toBe(true);
  const firstSummary = first.getByRole('region', { name: 'Please fix the following errors' });
  await expect(firstSummary.getByRole('button')).toHaveCount(2);
  await expect(firstSummary.getByRole('button', { name: /^Tags:/ })).toHaveCount(0);
  await first.getByRole('textbox', { name: /^Name/ }).fill('Tagged product');
  await first.getByRole('textbox', { name: /^Description/ }).fill('Ready with tags');
  await first.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  await expect.poll(async () => JSON.parse(await page.getByTestId('autoform-payload').innerText())).toEqual({
    tags: ['alpha', 'beta'], name: 'Tagged product', description: 'Ready with tags',
  });
  await expect(first.locator('[aria-invalid="true"]')).toHaveCount(0);
  await expect(first.getByRole('region', { name: 'Please fix the following errors' })).toHaveCount(0);
  const second = forms.nth(1);
  await expect(second.getByRole('textbox', { name: 'Tags', exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(second.getByRole('textbox', { name: 'Tags', exact: true }))
    .toHaveAccessibleDescription('Choose product tags. This field is required');
  await expect(second.getByRole('region', { name: 'Please fix the following errors' }).getByRole('button')).toHaveCount(3);
  await expect(second.getByRole('region', { name: 'Please fix the following errors' })
    .getByRole('button', { name: /^Tags:/ })).toHaveText('Tags: This field is required');
  await expect(second.locator('input[name="tags[]"]')).toHaveCount(0);
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('AutoForm multiselect keeps group IDREFs, checkbox focus and Space selection isolated', async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=autoform&compound=multiselect');
  const fixture = page.getByTestId('autoform-fixture');
  const forms = fixture.locator('form');
  await expect(forms).toHaveCount(2);
  const backward = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Shift+Tab' : 'Shift+Tab';
  const forward = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
  const resolveRefs = (form: ReturnType<typeof forms.nth>) => form.evaluate((element) => {
    const group = element.querySelector<HTMLElement>('[role="group"]');
    const resolve = (node: Element | null | undefined, attribute: string) =>
      (node?.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean).map((id) => {
        const target = document.getElementById(id);
        return {
          id,
          connected: target?.isConnected === true,
          inForm: target !== null && element.contains(target),
          text: target?.textContent ?? '',
        };
      });
    const checkboxes = Array.from((group ?? element).querySelectorAll<HTMLElement>('[role="checkbox"]'));
    return {
      group: {
        label: resolve(group, 'aria-labelledby'),
        description: resolve(group, 'aria-describedby'),
        invalid: group?.getAttribute('data-invalid'),
      },
      checkboxes: checkboxes.map(checkbox => ({
        described: resolve(checkbox, 'aria-describedby'),
        invalid: checkbox.getAttribute('aria-invalid'),
        disabled: (checkbox as HTMLButtonElement).disabled,
      })),
    };
  });
  const describedIds: string[][] = [];
  for (const form of await forms.all()) {
    const group = form.getByRole('group', { name: /^Labels/ });
    const alpha = group.getByRole('checkbox', { name: 'Alpha', exact: true });
    const beta = group.getByRole('checkbox', { name: 'Beta', exact: true });
    const disabledOption = group.getByRole('checkbox', { name: 'Disabled', exact: true });
    await expect(group).toHaveAccessibleDescription('Choose product labels.');
    await expect(alpha).not.toBeChecked();
    await expect(beta).not.toBeChecked();
    await expect(disabledOption).toBeDisabled();
    await expect(disabledOption).not.toBeChecked();

    const initial = await resolveRefs(form);
    expect(initial.group.label).toHaveLength(1);
    expect(initial.group.label[0]?.connected && initial.group.label[0]?.inForm).toBe(true);
    expect(initial.group.label[0]?.text).toContain('Labels');
    expect(initial.group.description).toHaveLength(1);
    expect(initial.group.description[0]?.text).toBe('Choose product labels.');
    expect(initial.group.invalid).toBeNull();
    expect(initial.checkboxes).toHaveLength(3);
    for (const checkbox of initial.checkboxes) {
      expect(checkbox.described.map(node => node.id)).toEqual(initial.group.description.map(node => node.id));
      expect(checkbox.described.every(node => node.connected && node.inForm)).toBe(true);
      expect(checkbox.invalid).toBeNull();
    }

    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(alpha).toBeFocused();
    await expect(group).toHaveAttribute('data-invalid', 'true');
    await expect(alpha).toHaveAttribute('aria-invalid', 'true');
    await expect(form.locator('[aria-invalid="true"]')).toHaveCount(5);
    await expect(group).toHaveAccessibleDescription('Choose product labels. This field is required');
    const summary = form.getByRole('region', { name: 'Please fix the following errors' });
    await expect(summary.getByRole('button')).toHaveCount(3);
    const labelsEntry = summary.getByRole('button', { name: /^Labels:/ });
    await expect(labelsEntry).toHaveText('Labels: This field is required');
    const invalid = await resolveRefs(form);
    expect(invalid.group.description).toHaveLength(2);
    expect(invalid.group.description[0]?.id).toBe(initial.group.description[0]?.id);
    expect(invalid.group.description[1]?.id).not.toBe(initial.group.description[0]?.id);
    expect(invalid.group.description.every(node => node.connected && node.inForm)).toBe(true);
    expect(invalid.group.description[1]?.text).toBe('This field is required');
    for (const checkbox of invalid.checkboxes) {
      expect(checkbox.invalid).toBe('true');
      expect(checkbox.described.map(node => node.id)).toEqual(invalid.group.description.map(node => node.id));
      expect(checkbox.described.every(node => node.connected && node.inForm)).toBe(true);
    }
    expect(invalid.checkboxes[2]?.disabled).toBe(true);

    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(labelsEntry).toBeFocused();
    await page.keyboard.press(forward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(forward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(forward);
    await expect(alpha).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(labelsEntry).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(alpha).toBeFocused();
    describedIds.push(invalid.group.description.map(node => node.id));
  }
  expect(describedIds).toHaveLength(2);
  expect(describedIds[0]?.some(id => describedIds[1]?.includes(id))).toBe(false);
  await expect(page.getByTestId('autoform-success-count')).toHaveText('0');

  const first = forms.nth(0);
  const firstGroup = first.getByRole('group', { name: /^Labels/ });
  const firstAlpha = firstGroup.getByRole('checkbox', { name: 'Alpha', exact: true });
  const firstBeta = firstGroup.getByRole('checkbox', { name: 'Beta', exact: true });
  const firstDisabled = firstGroup.getByRole('checkbox', { name: 'Disabled', exact: true });
  const firstSummary = first.getByRole('region', { name: 'Please fix the following errors' });
  await firstSummary.getByRole('button', { name: /^Labels:/ }).click();
  await expect(firstAlpha).toBeFocused();
  await page.keyboard.press('Space');
  await expect(firstAlpha).toBeChecked();
  await expect(firstBeta).not.toBeChecked();
  await expect(firstDisabled).toBeDisabled();
  await expect(firstDisabled).not.toBeChecked();
  await expect(first.locator('input[name="labels[]"]')).toHaveCount(1);
  await expect(first.locator('input[name="labels[]"]')).toHaveValue('alpha');
  await expect(firstAlpha).not.toHaveAttribute('aria-invalid', 'true');
  await expect(first.locator('[aria-invalid="true"]')).toHaveCount(2);
  await expect(firstGroup).not.toHaveAttribute('data-invalid', 'true');
  await expect(firstGroup).toHaveAccessibleDescription('Choose product labels.');
  await expect(firstSummary.getByRole('button')).toHaveCount(2);
  await expect(firstSummary.getByRole('button', { name: /^Labels:/ })).toHaveCount(0);
  const corrected = await resolveRefs(first);
  expect(corrected.group.description).toHaveLength(1);
  expect(corrected.group.description[0]?.id).toBe(describedIds[0]?.[0]);
  expect(corrected.group.description[0]?.text).toBe('Choose product labels.');
  for (const checkbox of corrected.checkboxes) {
    expect(checkbox.described.map(node => node.id)).toEqual([describedIds[0]?.[0]]);
    expect(checkbox.described.every(node => node.connected && node.inForm)).toBe(true);
    expect(checkbox.invalid).toBeNull();
  }
  await first.getByRole('textbox', { name: /^Name/ }).fill('Labelled product');
  await first.getByRole('textbox', { name: /^Description/ }).fill('Ready with labels');
  await first.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  await expect.poll(async () => JSON.parse(await page.getByTestId('autoform-payload').innerText())).toEqual({
    labels: ['alpha'], name: 'Labelled product', description: 'Ready with labels',
  });
  await expect(first.locator('[aria-invalid="true"]')).toHaveCount(0);
  await expect(firstSummary).toHaveCount(0);
  const second = forms.nth(1);
  const secondGroup = second.getByRole('group', { name: /^Labels/ });
  await expect(secondGroup).toHaveAttribute('data-invalid', 'true');
  await expect(second.locator('[aria-invalid="true"]')).toHaveCount(5);
  await expect(secondGroup.getByRole('checkbox', { name: 'Alpha', exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(second.getByRole('region', { name: 'Please fix the following errors' }).getByRole('button')).toHaveCount(3);
  await expect(second.getByRole('region', { name: 'Please fix the following errors' })
    .getByRole('button', { name: /^Labels:/ })).toHaveText('Labels: This field is required');
  await expect(second.locator('input[name="labels[]"]')).toHaveCount(0);
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('AutoForm images keeps URL and remove references, keyboard summary return and exact payload isolated', async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=autoform&compound=images');
  const fixture = page.getByTestId('autoform-fixture');
  const forms = fixture.locator('form');
  await expect(forms).toHaveCount(2);
  const backward = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Shift+Tab' : 'Shift+Tab';
  const forward = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
  const inspect = (form: ReturnType<typeof forms.nth>) => form.evaluate((element) => {
    const field = element.querySelector<HTMLElement>('[data-svadmin-field-key="images"]');
    const resolve = (node: Element | null | undefined, attribute: string) =>
      (node?.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean).map((id) => {
        const target = document.getElementById(id);
        return {
          id,
          connected: target?.isConnected === true,
          inForm: target !== null && element.contains(target),
          text: target?.textContent ?? '',
        };
      });
    const inputs = Array.from(field?.querySelectorAll<HTMLInputElement>('input[type="text"]') ?? []);
    const removes = Array.from(field?.querySelectorAll<HTMLButtonElement>('button[aria-label="Remove image"]') ?? []);
    const add = Array.from(field?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find(button => button.textContent?.includes('Add image'));
    return {
      description: field?.querySelector('[data-svadmin-field-description]')?.textContent ?? '',
      add: add ? {
        invalid: add.getAttribute('aria-invalid'),
        described: resolve(add, 'aria-describedby'),
      } : null,
      inputs: inputs.map(input => ({
        value: input.value,
        invalid: input.getAttribute('aria-invalid'),
        described: resolve(input, 'aria-describedby'),
      })),
      removes: removes.map(remove => ({
        label: remove.getAttribute('aria-label'),
        described: resolve(remove, 'aria-describedby'),
      })),
      hidden: Array.from(field?.querySelectorAll<HTMLInputElement>('input[type="hidden"]') ?? []).map(input => input.value),
    };
  });
  const probedIds: string[][] = [];
  for (const form of await forms.all()) {
    const field = form.locator('[data-svadmin-field-key="images"]');
    await expect(field.locator('[data-svadmin-field-description]')).toHaveText('Choose product images.');
    const add = form.getByRole('button', { name: 'Add image', exact: true });
    await expect(add).toBeVisible();
    await expect(field.locator('input[type="text"]')).toHaveCount(0);
    await expect(field.locator('input[type="hidden"]')).toHaveCount(0);

    await add.click();
    await expect(field.locator('input[type="text"]')).toHaveCount(1);
    await expect(field.locator('input[type="hidden"]')).toHaveCount(1);
    await expect(field.locator('input[type="hidden"]')).toHaveValue('');
    const probe = await inspect(form);
    expect(probe.add?.invalid).toBeNull();
    expect(probe.add?.described).toHaveLength(1);
    expect(probe.add?.described[0]?.connected).toBe(true);
    expect(probe.add?.described[0]?.inForm).toBe(true);
    expect(probe.add?.described[0]?.text).toBe('Choose product images.');
    expect(probe.inputs).toHaveLength(1);
    expect(probe.inputs[0]?.value).toBe('');
    expect(probe.inputs[0]?.invalid).toBeNull();
    expect(probe.inputs[0]?.described).toHaveLength(1);
    expect(probe.inputs[0]?.described[0]?.connected).toBe(true);
    expect(probe.inputs[0]?.described[0]?.inForm).toBe(true);
    expect(probe.inputs[0]?.described[0]?.text).toBe('Choose product images.');
    expect(probe.removes).toHaveLength(1);
    expect(probe.removes[0]?.label).toBe('Remove image');
    expect(probe.removes[0]?.described).toHaveLength(1);
    expect(probe.removes[0]?.described[0]?.connected).toBe(true);
    expect(probe.removes[0]?.described[0]?.inForm).toBe(true);
    expect(probe.removes[0]?.described[0]?.text).toBe('Choose product images.');
    await field.locator('button[aria-label="Remove image"]').click();
    await expect(field.locator('input[type="text"]')).toHaveCount(0);
    await expect(field.locator('input[type="hidden"]')).toHaveCount(0);
    probedIds.push([
      ...(probe.add?.described.map(node => node.id) ?? []),
      ...probe.inputs.flatMap(input => input.described.map(node => node.id)),
      ...probe.removes.flatMap(remove => remove.described.map(node => node.id)),
    ]);

    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(add).toBeFocused();
    await expect(form.locator('[aria-invalid="true"]')).toHaveCount(3);
    await expect(field.locator('input[type="hidden"]')).toHaveCount(0);
    // 空列表只有 Add 入口：保存后它必须精确关联说明和宿主错误节点。
    const emptyInvalid = await inspect(form);
    expect(emptyInvalid.add?.invalid).toBe('true');
    expect(emptyInvalid.add?.described).toHaveLength(2);
    expect(emptyInvalid.add?.described[0]?.text).toBe('Choose product images.');
    expect(emptyInvalid.add?.described[1]?.text).toBe('Invalid format');
    expect(emptyInvalid.add?.described.every(node => node.connected && node.inForm)).toBe(true);
    const summary = form.getByRole('region', { name: 'Please fix the following errors' });
    await expect(summary.getByRole('button')).toHaveCount(3);
    const imagesEntry = summary.getByRole('button', { name: /^Images:/ });
    await expect(imagesEntry).toHaveText('Images: Invalid format');
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(imagesEntry).toBeFocused();
    await page.keyboard.press(forward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(forward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(forward);
    await expect(add).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Description:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(summary.getByRole('button', { name: /^Name:/ })).toBeFocused();
    await page.keyboard.press(backward);
    await expect(imagesEntry).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(add).toBeFocused();
  }
  expect(probedIds).toHaveLength(2);
  expect(probedIds[0]?.some(id => probedIds[1]?.includes(id))).toBe(false);

  const first = forms.nth(0);
  const firstField = first.locator('[data-svadmin-field-key="images"]');
  const firstAdd = first.getByRole('button', { name: 'Add image', exact: true });
  const urls = firstField.locator('input[type="text"]');
  await firstAdd.click();
  await expect(urls).toHaveCount(1);
  await urls.nth(0).fill('https://example.com/old.jpg');
  await firstAdd.click();
  await expect(urls).toHaveCount(2);
  await urls.nth(1).fill('https://example.com/new.jpg');
  await expect(firstField.locator('input[type="hidden"]')).toHaveCount(2);
  expect(await firstField.locator('input[type="hidden"]').evaluateAll(nodes =>
    nodes.map(node => (node as HTMLInputElement).value))).toEqual([
    'https://example.com/old.jpg',
    'https://example.com/new.jpg',
  ]);
  const live = await inspect(first);
  expect(live.add?.invalid).toBeNull();
  expect(live.add?.described).toHaveLength(1);
  expect(live.add?.described[0]?.text).toBe('Choose product images.');
  expect(live.add?.described.every(node => node.connected && node.inForm)).toBe(true);
  expect(live.inputs).toHaveLength(2);
  for (const input of live.inputs) {
    expect(input.invalid).toBeNull();
    expect(input.described).toHaveLength(1);
    expect(input.described.every(node => node.connected && node.inForm)).toBe(true);
    expect(input.described[0]?.text).toBe('Choose product images.');
  }
  expect(live.removes).toHaveLength(2);
  for (const remove of live.removes) {
    expect(remove.label).toBe('Remove image');
    expect(remove.described).toHaveLength(1);
    expect(remove.described[0]?.text).toBe('Choose product images.');
    expect(remove.described.every(node => node.connected && node.inForm)).toBe(true);
  }
  await firstField.locator('button[aria-label="Remove image"]').nth(0).click();
  await expect(urls).toHaveCount(1);
  await expect(urls.nth(0)).toHaveValue('https://example.com/new.jpg');
  await expect(firstField.locator('input[type="hidden"]')).toHaveCount(1);
  await expect(firstField.locator('input[type="hidden"]')).toHaveValue('https://example.com/new.jpg');
  await expect(firstField.locator('[aria-invalid="true"]')).toHaveCount(0);
  const firstSummary = first.getByRole('region', { name: 'Please fix the following errors' });
  await expect(firstSummary.getByRole('button', { name: /^Images:/ })).toHaveCount(0);
  await first.getByRole('textbox', { name: /^Name/ }).fill('Imaged product');
  await first.getByRole('textbox', { name: /^Description/ }).fill('Ready with images');
  await first.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  await expect.poll(async () => JSON.parse(await page.getByTestId('autoform-payload').innerText())).toEqual({
    images: ['https://example.com/new.jpg'], name: 'Imaged product', description: 'Ready with images',
  });
  await expect(first.locator('[aria-invalid="true"]')).toHaveCount(0);
  await expect(firstSummary).toHaveCount(0);

  const second = forms.nth(1);
  const secondField = second.locator('[data-svadmin-field-key="images"]');
  await expect(secondField.locator('input[type="hidden"]')).toHaveCount(0);
  await expect(second.locator('[aria-invalid="true"]')).toHaveCount(3);
  const secondSummary = second.getByRole('region', { name: 'Please fix the following errors' });
  await expect(secondSummary.getByRole('button')).toHaveCount(3);
  await expect(secondSummary.getByRole('button', { name: /^Images:/ })).toHaveText('Images: Invalid format');
  await expect(page.getByTestId('autoform-success-count')).toHaveText('1');
  expect(errors).toEqual([]);
});
