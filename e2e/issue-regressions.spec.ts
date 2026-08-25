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
});
