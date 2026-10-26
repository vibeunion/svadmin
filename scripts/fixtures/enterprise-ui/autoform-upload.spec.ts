import { test, expect, type Page } from '@playwright/test';

const pageErrors = new WeakMap<Page, string[]>();

function fixture(page: Page) {
  return page.getByTestId('autoform-upload-fixture');
}

function saveButton(page: Page) {
  return fixture(page).getByRole('button', { name: 'Save', exact: true });
}

function fileInput(page: Page) {
  return fixture(page).locator('input[type="file"]');
}

function fieldError(page: Page) {
  return fixture(page)
    .locator('[data-svadmin-field-key="attachment"] > [role="alert"]');
}

async function lastWrite(page: Page): Promise<Record<string, unknown>> {
  return JSON.parse(await page.getByTestId('last-write').innerText()) as Record<string, unknown>;
}

test.beforeEach(async ({ page }) => {
  pageErrors.set(page, []);
  page.on('pageerror', error => pageErrors.get(page)?.push(error.message));
  await page.goto('/?view=autoform-upload');
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page) ?? []).toEqual([]);
});

test('pending upload blocks save and a completed session writes only the JSON reference', async ({ page }) => {
  const host = fixture(page);
  const attachment = host.getByRole('list', { name: 'Attachment', exact: true });
  await expect(attachment).toContainText('/existing/quarterly-report.pdf');

  const save = saveButton(page);
  await expect(save).toBeEnabled();

  await fileInput(page).setInputFiles({
    name: 'report.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('report'),
  });
  await expect(page.getByTestId('pending-session')).toHaveText('["pending-session-1"]');
  await expect(save).toBeDisabled();

  // 直接表单提交也必须被 pending 上传阻断，不能产生写入。
  await host.getByRole('textbox', { name: /^Title/ }).press('Enter');
  await page.waitForTimeout(100);
  await expect(page.getByTestId('write-count')).toHaveText('0');
  await expect(page.getByTestId('last-write')).toHaveText('No write');

  await page.getByTestId('complete-upload-1').click();
  await expect(host.getByRole('list', { name: 'Selected files', exact: true })).toContainText('success');
  await expect(save).toBeEnabled();
  await save.click();

  await expect(page.getByTestId('write-count')).toHaveText('1');
  await expect(page.getByTestId('success-count')).toHaveText('1');
  const payload = await lastWrite(page);
  expect(payload.title).toBe('Quarterly report');
  expect(payload.attachment).toEqual({
    url: '/uploads/session-1.pdf',
    uploadId: 'pending-session-1',
  });
  expect(JSON.stringify(payload)).not.toContain('File');
});

test('reset cancels a pending session, restores the baseline, and ignores a late receipt', async ({ page }) => {
  const host = fixture(page);
  const attachment = host.getByRole('list', { name: 'Attachment', exact: true });

  await fileInput(page).setInputFiles({
    name: 'stale.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('stale'),
  });
  await expect(page.getByTestId('pending-session')).toHaveText('["pending-session-1"]');
  await expect(saveButton(page)).toBeDisabled();

  await page.getByTestId('reset-form').click();
  await expect(page.getByTestId('reset-calls')).toHaveText('1');
  await expect(attachment).toContainText('/existing/quarterly-report.pdf');
  await expect(host.getByRole('list', { name: 'Selected files', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('cancellations')).toContainText('"reason":"unmount"');
  await expect(page.getByTestId('cancellations')).toContainText('"uploadId":"pending-session-1"');

  // 旧 session 回执迟到：组件已重挂载，不能写回表单。
  await page.getByTestId('complete-upload-1').click();
  await page.waitForTimeout(100);
  await expect(page.getByTestId('write-count')).toHaveText('0');
  await expect(page.getByTestId('last-write')).toHaveText('No write');
  await expect(host.getByRole('list', { name: 'Selected files', exact: true })).toHaveCount(0);
  await expect(attachment).toContainText('/existing/quarterly-report.pdf');

  // reset 后重新上传并保存，只写新会话引用。
  await fileInput(page).setInputFiles({
    name: 'fresh.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('fresh'),
  });
  await expect(page.getByTestId('pending-session')).toHaveText('["pending-session-2"]');
  await page.getByTestId('complete-upload-2').click();
  const save = saveButton(page);
  await expect(save).toBeEnabled();
  await save.click();

  await expect(page.getByTestId('write-count')).toHaveText('1');
  const payload = await lastWrite(page);
  expect(payload.title).toBe('Quarterly report');
  expect(payload.attachment).toEqual({
    url: '/uploads/session-2.pdf',
    uploadId: 'pending-session-2',
  });
});

test('failed upload keeps the old baseline, blocks save, and succeeds only after retry', async ({ page }) => {
  const host = fixture(page);
  const attachment = host.getByRole('list', { name: 'Attachment', exact: true });
  const save = saveButton(page);

  await fileInput(page).setInputFiles({
    name: 'retry.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('retry'),
  });
  await expect(page.getByTestId('pending-session')).toHaveText('["pending-session-1"]');
  await page.getByTestId('fail-upload-1').click();

  await expect(host.getByRole('list', { name: 'Selected files', exact: true })).toContainText('error');
  await expect(host.getByRole('button', { name: 'Retry upload', exact: true })).toBeEnabled();
  await expect(attachment).toContainText('/existing/quarterly-report.pdf');
  await expect(save).toBeDisabled();

  await host.getByRole('textbox', { name: /^Title/ }).press('Enter');
  await page.waitForTimeout(100);
  await expect(page.getByTestId('write-count')).toHaveText('0');
  await expect(page.getByTestId('last-write')).toHaveText('No write');

  await host.getByRole('button', { name: 'Retry upload', exact: true }).press('Space');
  await expect(page.getByTestId('pending-session')).toHaveText('["pending-session-2"]');
  await expect(save).toBeDisabled();
  await page.getByTestId('complete-upload-2').click();
  await expect(save).toBeEnabled();
  await save.click();

  await expect(page.getByTestId('write-count')).toHaveText('1');
  await expect(page.getByTestId('success-count')).toHaveText('1');
  const payload = await lastWrite(page);
  expect(payload.title).toBe('Quarterly report');
  expect(payload.attachment).toEqual({
    url: '/uploads/session-2.pdf',
    uploadId: 'pending-session-2',
  });
});

test('required attachment feedback follows keyboard-reachable existing remove, cancel, and retry', async ({ page, browserName }) => {
  const host = fixture(page);
  const title = host.getByRole('textbox', { name: /^Title/ });
  const save = saveButton(page);
  const attachment = host.getByRole('list', { name: 'Attachment', exact: true });
  const existingRemove = host.getByRole('button', { name: 'Remove /existing/quarterly-report.pdf', exact: true });
  const requiredFeedback = /Attach the signed quarterly report\.\s+This field is required/;
  // macOS WebKit 未开启全键盘访问时用 Alt+Tab / Alt+Shift+Tab 遍历全部控件。
  const allControls = browserName === 'webkit' && process.platform === 'darwin';
  const forward = allControls ? 'Alt+Tab' : 'Tab';
  const backward = allControls ? 'Alt+Shift+Tab' : 'Shift+Tab';

  await expect(attachment).toContainText('/existing/quarterly-report.pdf');
  await expect(existingRemove).toHaveAccessibleDescription('Attach the signed quarterly report.');

  // 从标题真实 Tab 到既有附件移除，再用 Shift+Tab 回退，不直接聚焦目标。
  await title.click();
  await page.keyboard.press(forward);
  await expect(existingRemove).toBeFocused();
  await page.keyboard.press(forward);
  await page.keyboard.press(backward);
  await expect(existingRemove).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(attachment).toHaveCount(0);

  // 真实 AutoForm + 必填字段触发错误，而不是宿主注入 invalid。
  await save.click();
  await expect(fieldError(page)).toContainText('This field is required');

  await fileInput(page).setInputFiles({
    name: 'keyboard.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('keyboard'),
  });
  await expect(page.getByTestId('pending-session')).toHaveText('["pending-session-1"]');
  await expect(save).toBeDisabled();

  await title.click();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  await expect(page.getByTestId('write-count')).toHaveText('0');

  const cancel = host.getByRole('button', { name: 'Cancel upload', exact: true });
  await title.click();
  await page.keyboard.press(forward);
  await page.keyboard.press(forward);
  await page.keyboard.press(forward);
  await expect(cancel).toBeFocused();
  await expect(cancel).toHaveAccessibleDescription(requiredFeedback);
  await expect(cancel).toHaveAttribute('aria-invalid', 'true');

  const queueRemove = host.getByRole('button', { name: 'Remove file', exact: true });
  await page.keyboard.press(forward);
  await expect(queueRemove).toBeFocused();
  await expect(queueRemove).toHaveAccessibleDescription(requiredFeedback);
  await page.keyboard.press(backward);
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(host.getByRole('list', { name: 'Selected files', exact: true })).toContainText('cancelled');
  await expect(page.getByTestId('cancellations')).toContainText('"reason":"cancel"');
  await expect(page.getByTestId('cancellations')).toContainText('"uploadId":"pending-session-1"');

  const retry = host.getByRole('button', { name: 'Retry upload', exact: true });
  await title.click();
  await page.keyboard.press(forward);
  await page.keyboard.press(forward);
  await page.keyboard.press(forward);
  await expect(retry).toBeFocused();
  await expect(retry).toHaveAccessibleDescription(requiredFeedback);
  await expect(retry).toHaveAttribute('aria-invalid', 'true');
  await page.keyboard.press(forward);
  await expect(queueRemove).toBeFocused();
  await page.keyboard.press(backward);
  await expect(retry).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pending-session')).toContainText('pending-session-2');
  await expect(save).toBeDisabled();

  await page.getByTestId('complete-upload-2').click();
  await expect(host.getByRole('list', { name: 'Selected files', exact: true })).toContainText('success');
  await expect(save).toBeEnabled();
  await save.click();

  await expect(page.getByTestId('write-count')).toHaveText('1');
  await expect(page.getByTestId('success-count')).toHaveText('1');
  await expect(fieldError(page)).toHaveCount(0);
  await expect(host.getByText('This field is required')).toHaveCount(0);
  const payload = await lastWrite(page);
  expect(payload.title).toBe('Quarterly report');
  expect(payload.attachment).toEqual({
    url: '/uploads/session-2.pdf',
    uploadId: 'pending-session-2',
  });
});

test('cancelled queue item can be removed by keyboard while the real field error stays visible', async ({ page, browserName }) => {
  const host = fixture(page);
  const title = host.getByRole('textbox', { name: /^Title/ });
  const save = saveButton(page);
  const selectedFiles = host.getByRole('list', { name: 'Selected files', exact: true });
  const allControls = browserName === 'webkit' && process.platform === 'darwin';
  const forward = allControls ? 'Alt+Tab' : 'Tab';

  await title.click();
  await page.keyboard.press(forward);
  await page.keyboard.press('Enter');
  await expect(host.getByRole('list', { name: 'Attachment', exact: true })).toHaveCount(0);
  await save.click();
  await expect(fieldError(page)).toContainText('This field is required');

  await fileInput(page).setInputFiles({
    name: 'removable.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('removable'),
  });
  await expect(save).toBeDisabled();

  const cancel = host.getByRole('button', { name: 'Cancel upload', exact: true });
  await title.click();
  await page.keyboard.press(forward);
  await page.keyboard.press(forward);
  await page.keyboard.press(forward);
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(selectedFiles).toContainText('cancelled');

  const queueRemove = host.getByRole('button', { name: 'Remove file', exact: true });
  await title.click();
  await page.keyboard.press(forward);
  await page.keyboard.press(forward);
  await page.keyboard.press(forward);
  await expect(host.getByRole('button', { name: 'Retry upload', exact: true })).toBeFocused();
  await page.keyboard.press(forward);
  await expect(queueRemove).toBeFocused();
  await expect(queueRemove).toHaveAccessibleDescription(/Attach the signed quarterly report\.\s+This field is required/);
  await expect(queueRemove).toHaveAttribute('aria-invalid', 'true');
  await page.keyboard.press('Enter');

  await expect(selectedFiles).toHaveCount(0);
  await expect(fieldError(page)).toContainText('This field is required');
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByTestId('write-count')).toHaveText('0');
  await expect(page.getByTestId('last-write')).toHaveText('No write');
});
