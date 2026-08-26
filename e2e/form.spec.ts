import { test, expect } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/#/login');
  await page.locator('#login-identifier').fill('admin@example.com');
  await page.locator('#login-password').fill('demo');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/#\/$/, { timeout: 10000 });
}

async function openRecords(page: import('@playwright/test').Page) {
  const toggle = page.locator('[data-domain-record-toggle], [data-operations-record-toggle], [data-user-record-toggle]').first();
  await toggle.waitFor({ state: 'visible', timeout: 15000 });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

test.describe('Edit form persistence', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('persists the latest value after rapid edits', async ({ page }) => {
    await page.goto('/#/products');
    await openRecords(page);
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    const editButton = page.getByRole('button', { name: /edit/i }).first();
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();
    await expect(page).toHaveURL(/#\/products\/edit\//, { timeout: 5000 });

    const nameInput = page.getByRole('textbox', { name: /^Name\b/ });
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill('Race Condition Payload 1');
    await nameInput.fill('Race Condition Payload 2');

    await page.getByRole('button', { name: /save/i }).click();
    await expect(page).toHaveURL(/#\/products(?:\?|$)/, { timeout: 10000 });
    await openRecords(page);
    await expect(page.getByRole('cell', { name: 'Race Condition Payload 2', exact: true })).toBeVisible({ timeout: 10000 });
  });
});
