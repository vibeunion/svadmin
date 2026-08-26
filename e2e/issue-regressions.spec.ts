import { test, expect } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/#/login');
  await page.locator('#login-identifier').fill('admin@example.com');
  await page.locator('#login-password').fill('demo');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/#\/$/, { timeout: 10000 });
}

test.describe('Issue regression coverage', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('create form exposes named controls and focuses the first validation error', async ({ page }) => {
    await page.goto('/#/products/create');
    const form = page.locator('main form');
    const nameInput = form.locator('[name="name"]');

    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await form.locator('button[type="submit"]').click();

    await expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    await expect(nameInput).toHaveAttribute('aria-describedby', 'products-name-error');
    await expect(page.locator('#products-name-error')).toBeVisible();
    await expect(nameInput).toBeFocused();
  });

  test('user role and status filters change the visible directory rows', async ({ page }) => {
    await page.goto('/#/users');
    const directory = page.getByRole('table', { name: /user directory|用户目录/i });

    await expect(directory.locator('tbody tr')).toHaveCount(4, { timeout: 10000 });
    await page.getByRole('button', { name: /all roles|所有角色/i }).click();
    await page.getByRole('menuitemcheckbox', { name: 'Inventory Admin' }).click();
    await expect(directory.locator('tbody tr')).toHaveCount(1);
    await expect(directory).toContainText('Jordan Lee');

    await page.getByRole('button', { name: /all users|所有用户/i }).click();
    await page.getByRole('menuitemcheckbox', { name: /invited|已邀请/i }).click();
    await expect(directory).toContainText(/no users match|没有匹配的用户/i);
  });

  test('updates the document title for resource and settings routes', async ({ page }) => {
    await page.goto('/#/products');
    await expect(page).toHaveTitle(/Products|商品/);

    await page.goto('/#/settings/appearance');
    await expect(page).toHaveTitle(/Appearance|外观/);
  });

  test('shows a working theme toggle in the top header', async ({ page }) => {
    const header = page.getByRole('banner');
    const toggle = header.getByRole('button', { name: /toggle theme|切换主题/i });
    await expect(toggle).toBeVisible();

    const before = await page.locator('html').getAttribute('class');
    await toggle.click();
    await expect.poll(async () => page.locator('html').getAttribute('class')).not.toBe(before);
  });

  test('selects and persists the interface language', async ({ page }) => {
    const language = page.getByRole('combobox', { name: /switch language|切换语言/i });
    await language.selectOption('zh-CN');
    await expect(language).toHaveValue('zh-CN');

    await page.reload();
    await expect(page.getByRole('combobox', { name: /切换语言/i })).toHaveValue('zh-CN');
  });

  test('renders role and audit settings on their reported routes', async ({ page }) => {
    await page.goto('/#/settings/roles');
    await expect(page.getByRole('button', { name: /Inventory Admin/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Toggle Create/i }).first()).toBeEnabled();

    await page.goto('/#/settings/audit-logs');
    await expect(page.getByRole('heading', { name: /audit logs|审计日志/i })).toBeVisible();
    await expect(page.getByRole('table').last()).toBeVisible();
  });

  test('offers row actions in the primary user directory', async ({ page }) => {
    await page.goto('/#/users');
    const directory = page.getByRole('table', { name: /user directory|用户目录/i });
    const firstRow = directory.locator('tbody tr').first();

    await expect(firstRow.getByRole('link', { name: /view|查看/i })).toBeVisible();
    await expect(firstRow.getByRole('link', { name: /edit|编辑/i })).toBeVisible();
  });

  test('supports legacy product detail and edit URLs', async ({ page }) => {
    await page.goto('/#/products/1');
    await expect(page.getByRole('heading', { name: /Products.*Detail|商品.*详情/i })).toBeVisible();

    await page.goto('/#/products/1/edit');
    await expect(page.locator('main form')).toBeVisible();
  });

  test('marks the current session and revokes another session', async ({ page }) => {
    await page.goto('/#/security_sessions');
    const sessionPanel = page.locator('[data-session-monitor-layout]');

    await expect(sessionPanel).toContainText(/current|当前/i);
    const revoke = sessionPanel.getByRole('button', { name: /revoke.*iPhone|撤销.*iPhone/i });
    await revoke.click();
    await page.getByRole('button', { name: /^revoke$|^撤销$/i }).last().click();
    const iphoneSession = sessionPanel.getByText('iPhone 15').locator('xpath=ancestor::article');
    await expect(iphoneSession).toContainText(/revoked|已撤销/i);
    await expect(iphoneSession.getByRole('button', { name: /revoke|撤销/i })).toHaveCount(0);
  });

  test('revokes all other sessions without revoking the current device', async ({ page }) => {
    await page.goto('/#/security_sessions');
    const sessionPanel = page.locator('[data-session-monitor-layout]');
    await sessionPanel.getByRole('button', { name: /revoke other sessions|撤销其他会话/i }).click();
    await page.getByRole('button', { name: /^revoke$|^撤销$/i }).last().click();
    await expect(sessionPanel.getByRole('button', { name: /revoke other sessions|撤销其他会话/i })).toHaveCount(0);
    await expect(sessionPanel).toContainText(/current|当前/i);
    await expect(sessionPanel.getByText('MacBook Pro').locator('xpath=ancestor::article')).toContainText(/active|活跃/i);
  });
});
