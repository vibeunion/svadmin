import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stableScreenshot } from '../scripts/stable-screenshot.mjs';

test.use({ locale: 'en-US' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('svadmin-locale', 'en'));
});
async function openOffice(page: Page, view = 'dashboard') {
  await page.addInitScript(() => localStorage.setItem('svadmin_demo_auth', JSON.stringify({ email: 'demo@example.com' })));
  await page.goto(`/?officeView=${view}#/health_office`);
  const office = page.locator('[data-office-workspace]');
  await expect(office).toBeVisible({ timeout: 15000 });
  return office;
}

test('中文办公：英文浏览器与旧英文偏好不能覆盖产品语言', async ({ page }) => {
  const office = await openOffice(page);
  await expect(page).toHaveTitle('智能辅助办公系统');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('body')).not.toContainText('Health Office');
  await expect(page.locator('body')).not.toContainText('svadmin example');
  await expect(office.getByText('报告审核工作平台', { exact: true })).toBeVisible();
  await expect(office).toContainText('演示审核员');
  await page.reload();
  await expect(office).toBeVisible({ timeout: 15000 });
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  expect(await page.evaluate(() => localStorage.getItem('svadmin-locale'))).toBe('en');
});

test('中文办公：十四个视图不显示内部英文角色或状态', async ({ page }) => {
  test.setTimeout(90000);
  await openOffice(page);
  const views = ['dashboard', 'reports', 'imports', 'report', 'verification', 'alerts', 'alert', 'proofreading', 'analytics', 'rules', 'messages', 'users', 'audit', 'integrations'];
  const residual = /\b(?:worker|reviewer|admin|auditor|north|south|processing|waiting|closed|approved|published|fixture-v1|expectedRevision|idempotencyKey|requestId|CRUD)\b/;
  for (const view of views) {
    await page.goto(`/?officeView=${view}#/health_office`);
    const office = page.locator('[data-office-workspace]');
    await expect(office).toBeVisible({ timeout: 15000 });
    const actor = view === 'audit' ? 'auditor' : ['rules', 'users', 'integrations'].includes(view) ? 'admin' : 'worker';
    await office.getByRole('combobox', { name: '切换演示身份' }).selectOption(actor);
    await expect(office.locator('[data-office-denied]')).toHaveCount(0);
    await expect(office).toHaveAttribute('data-office-view', view);
    expect(await office.innerText()).not.toMatch(residual);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  }
});

test('中文办公：文件按钮和空表单错误使用中文', async ({ page }) => {
  const office = await openOffice(page, 'imports');
  await expect(office.getByRole('button', { name: '选择报告文件', exact: true })).toBeVisible();
  await expect(office.locator('input[type="file"]')).toBeHidden();
  await expect(office).not.toContainText('Choose File');
  await page.goto('/?officeView=verification#/health_office');
  await expect(office).toHaveAttribute('data-office-view', 'verification');
  await office.getByRole('button', { name: '保存并确认核对', exact: true }).click();
  await expect(office.locator('.office-feedback')).toContainText('请填写至少 4 个字符');
});

test('中文办公：完整中文登录及失败提示', async ({ page }) => {
  await page.goto('/?officeApp=1#/login');
  await expect(page.locator('#login-password')).toBeVisible();
  await expect(page).toHaveTitle('智能辅助办公系统');
  await page.locator('#login-identifier').fill('demo@example.com');
  await page.locator('#login-password').fill('wrong-password');
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText('密码不正确，请使用页面预填的演示密码。', { exact: true })).toBeVisible();
  await page.locator('#login-password').fill('demo');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/#\/health_office$/);
  await expect(page.locator('[data-office-workspace]')).toBeVisible({ timeout: 15000 });
});

test('中文办公：退出工作区不覆盖其他示例的英文偏好', async ({ page }) => {
  await openOffice(page);
  await page.goto('/#/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('svadmin example');
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  test(`中文办公：实际页面证据 ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const office = await openOffice(page);
    await expect.poll(() => office.evaluate((element) => {
      let opacity = 1;
      for (let node: Element | null = element; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
      return opacity;
    })).toBe(1);
    const directory = info.outputPath('screenshots');
    await mkdir(directory, { recursive: true });
    const image = await stableScreenshot(() => page.screenshot({ fullPage: true, animations: 'disabled' }));
    await writeFile(join(directory, `office-chinese-${viewport.width}x${viewport.height}.png`), image);
    await info.attach('全中文工作台', { body: image, contentType: 'image/png' });
  });
}
