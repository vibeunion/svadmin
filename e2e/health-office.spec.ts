import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stableScreenshot } from '../scripts/stable-screenshot.mjs';

async function openOffice(page: Page, query = '') {
  await page.goto('/#/login');
  await page.locator('#login-identifier').fill('admin@example.com');
  await page.locator('#login-password').fill('demo');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/#\/$/);
  await page.goto(`/${query}#/health_office`);
  const office = page.locator('[data-office-workspace]');
  await expect(office).toHaveCount(1);
  await expect(office).toBeVisible();
  return office;
}
async function capture(page: Page, info: TestInfo, name: string) {
  const directory = info.outputPath('screenshots');
  await mkdir(directory, { recursive: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const image = await stableScreenshot(() => page.screenshot({ fullPage: true, animations: 'disabled' }));
  await writeFile(join(directory, `${name}.png`), image);
  await info.attach(name, { body: image, contentType: 'image/png' });
}

test('health office: desktop dashboard and scoped report search', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  const office = await openOffice(page);
  await expect(office).toHaveAttribute('data-office-view', 'dashboard');
  await expect(office.getByText('交互演示 · 非生产系统', { exact: true })).toBeVisible();
  await capture(page, info, 'health-office-dashboard');
  await office.getByRole('navigation', { name: '辅助办公业务导航' }).getByRole('button', { name: '报告中心', exact: true }).click();
  await office.getByRole('textbox', { name: '搜索报告' }).fill('DEMO-R005');
  await expect(office.getByText('没有符合条件的报告', { exact: true })).toBeVisible();
  await office.getByRole('button', { name: '重置条件', exact: true }).click();
  await expect(office.locator('table tbody tr')).toHaveCount(3);
  await office.getByRole('button', { name: '下一页', exact: true }).click();
  await expect(office.locator('table tbody tr')).toHaveCount(1);
  await capture(page, info, 'health-office-reports');
  expect(errors).toEqual([]);
});

test('health office: critical alert requires another reviewer', async ({ page }, info) => {
  const office = await openOffice(page);
  await office.getByRole('button', { name: '处理任务', exact: true }).first().click();
  await office.getByRole('button', { name: '领取并确认任务', exact: true }).click();
  await expect(office.getByRole('button', { name: '提交处置', exact: true })).toBeEnabled();
  await office.getByRole('textbox', { name: '处理意见', exact: true }).fill('已根据合成记录完成处置。');
  await office.getByRole('button', { name: '提交处置', exact: true }).click();
  await expect(office.getByRole('button', { name: '复核通过并关闭', exact: true })).toBeDisabled();
  await capture(page, info, 'health-office-critical-review');
  await office.getByRole('combobox', { name: '切换演示身份' }).selectOption('reviewer');
  await office.getByRole('textbox', { name: '复核意见', exact: true }).fill('独立核对了合成处理证据。');
  await office.getByRole('button', { name: '复核通过并关闭', exact: true }).click();
  await expect(office.getByRole('heading', { name: '该预警已关闭' })).toBeVisible();
});

test('health office: proofreading preserves original and guards unsaved text', async ({ page }, info) => {
  const office = await openOffice(page, '?officeView=proofreading&officeReport=DEMO-R001');
  const editor = office.getByRole('textbox', { name: '审核工作稿', exact: true });
  const original = await editor.inputValue();
  expect(original).toContain('检杳');
  await office.getByRole('button', { name: '采纳', exact: true }).click();
  await expect(editor).not.toHaveValue(/检杳/);
  await expect(office.getByText('数据已变更，需重查', { exact: true })).toBeVisible();
  const saved = await editor.inputValue();
  await editor.fill(`${saved}尚未保存的追加文本。`);
  page.once('dialog', (dialog) => dialog.dismiss());
  await office.getByRole('navigation', { name: '辅助办公业务导航' }).getByRole('button', { name: '报告中心', exact: true }).click();
  await expect(office).toHaveAttribute('data-office-view', 'proofreading');
  await expect(editor).toHaveValue(`${saved}尚未保存的追加文本。`);
  await office.getByRole('button', { name: '撤销未保存修改', exact: true }).click();
  await expect(editor).toHaveValue(saved);
  await capture(page, info, 'health-office-proofreading');
  await office.getByRole('combobox', { name: '切换演示身份' }).selectOption('reviewer');
  await office.getByRole('navigation', { name: '报告工作区域' }).getByRole('button', { name: '报告详情', exact: true }).click();
  await office.getByRole('combobox', { name: '报告内容视图' }).selectOption('original');
  await expect(office.locator('.office-document')).toContainText(original);
});

test('health office: file preflight never uploads or claims parsing success', async ({ page }, info) => {
  const office = await openOffice(page, '?officeView=imports');
  const writes: string[] = [];
  page.on('request', (request) => { if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url()); });
  await office.getByLabel('选择报告文件', { exact: true }).setInputFiles([
    { name: 'synthetic.pdf', mimeType: 'application/pdf', buffer: Buffer.from('NOT A REAL REPORT; METADATA ONLY') },
    { name: 'unsupported.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('synthetic') },
  ]);
  await office.getByRole('button', { name: '建立本地预检清单', exact: true }).click();
  await expect(office.locator('table tbody tr')).toHaveCount(2);
  await expect(office.locator('table tbody tr').first()).toContainText('等待接入');
  await expect(office.locator('table tbody tr').last()).toContainText('已拒绝');
  await office.locator('table tbody tr').first().getByRole('button', { name: '取消', exact: true }).click();
  await expect(office.locator('table tbody tr').first()).toContainText('已取消');
  expect(writes).toEqual([]);
  await capture(page, info, 'health-office-import-states');
});

test('health office: configuration admin cannot view report and unknown ID is handled', async ({ page }, info) => {
  const office = await openOffice(page, '?officeView=report&officeReport=UNKNOWN');
  await expect(office.getByRole('heading', { name: '报告不存在或不在授权范围内' })).toBeVisible();
  await office.getByRole('combobox', { name: '切换演示身份' }).selectOption('admin');
  await expect(office.locator('[data-office-denied]')).toBeVisible();
  await expect(office.locator('table')).toHaveCount(0);
  await capture(page, info, 'health-office-permission-denied');
  await office.getByRole('navigation', { name: '辅助办公业务导航' }).getByRole('button', { name: '规则与词典', exact: true }).click();
  await office.getByRole('textbox', { name: '规则处理说明' }).fill('提交仅用于演示的流程草稿。');
  await office.getByRole('button', { name: '提交草稿', exact: true }).click();
  await expect(office.getByRole('button', { name: '独立复核', exact: true })).toBeDisabled();
  await office.getByRole('combobox', { name: '切换演示身份' }).selectOption('reviewer');
  await office.getByRole('textbox', { name: '规则处理说明' }).fill('独立审核演示流程，不启用规则。');
  await office.getByRole('button', { name: '独立复核', exact: true }).click();
  await expect(office.getByRole('button', { name: '演示发布状态', exact: true })).toBeEnabled();
});

test('health office: mobile layout remains navigable', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const office = await openOffice(page);
  await expect(office.getByRole('heading', { name: '智能辅助办公', exact: true })).toBeVisible();
  await office.getByRole('button', { name: '处理任务', exact: true }).first().click();
  await expect(office.getByRole('button', { name: '领取并确认任务', exact: true })).toBeVisible();
  await capture(page, info, 'health-office-mobile-alert');
});
