import { test, expect, type Page } from '@playwright/test';

function productHost(page: Page) {
  return page.getByTestId('product-form-host');
}

test.describe('form engine reset host entry', () => {
  test('AutoForm reset restores baseline values and clears validation feedback', async ({ page }) => {
    await page.goto('/?view=form-reset&kind=auto');
    const host = productHost(page);
    const name = host.getByRole('textbox', { name: /^Name/ });
    const description = host.getByRole('textbox', { name: /^Description/ });

    await expect(name).toHaveValue('Baseline');
    await expect(description).toHaveValue('Baseline description');
    // 产品表单没有公开 reset 按钮，只有测试 harness 暴露受控入口。
    await expect(host.getByRole('button', { name: /reset/i })).toHaveCount(0);

    await name.fill('');
    await description.fill('Changed description');
    await host.getByRole('button', { name: 'Save' }).click();
    await expect(host.getByRole('region', { name: 'Please fix the following errors' })).toBeVisible();
    await expect(name).toHaveAttribute('aria-invalid', 'true');

    await page.getByTestId('call-reset').click();

    await expect(page.getByTestId('reset-calls')).toHaveText('1');
    await expect(name).toHaveValue('Baseline');
    await expect(description).toHaveValue('Baseline description');
    await expect(name).not.toHaveAttribute('aria-invalid', 'true');
    await expect(host.getByRole('region', { name: 'Please fix the following errors' })).toHaveCount(0);
    await expect(page.getByTestId('write-count')).toHaveText('0');
    await expect(page.getByTestId('navigation-count')).toHaveText('0');
    await expect(page.getByTestId('success-count')).toHaveText('0');
  });

  test('StepsForm reset returns to the first step with baseline values', async ({ page }) => {
    await page.goto('/?view=form-reset&kind=steps');
    const host = productHost(page);
    const name = host.getByRole('textbox', { name: /^Name/ });

    await expect(name).toHaveValue('Baseline');
    await expect(host.getByRole('button', { name: /reset/i })).toHaveCount(0);

    await name.fill('Changed name');
    await host.getByRole('button', { name: 'Next' }).click();
    const description = host.getByRole('textbox', { name: /^Description/ });
    await expect(description).toBeVisible();
    await description.fill('Changed description');

    await page.getByTestId('call-reset').click();

    await expect(page.getByTestId('reset-calls')).toHaveText('1');
    await expect(host.getByRole('textbox', { name: /^Name/ })).toHaveValue('Baseline');
    await expect(description).toHaveCount(0);
    await expect(host.getByRole('button', { name: 'Next' })).toBeVisible();
    await expect(page.getByTestId('write-count')).toHaveText('0');
    await expect(page.getByTestId('navigation-count')).toHaveText('0');
    await expect(page.getByTestId('success-count')).toHaveText('0');

    await host.getByRole('button', { name: 'Next' }).click();
    await expect(host.getByRole('textbox', { name: /^Description/ }))
      .toHaveValue('Baseline description');
  });

  test('AutoForm reset is a no-op in read-only show mode', async ({ page }) => {
    await page.goto('/?view=form-reset&kind=auto&mode=show');
    const host = productHost(page);
    const name = host.getByRole('textbox', { name: /^Name/ });
    const description = host.getByRole('textbox', { name: /^Description/ });

    await expect(name).toBeDisabled();
    await expect(description).toBeDisabled();
    await expect(name).toHaveValue('Baseline');
    await expect(host.getByRole('button', { name: 'Save' })).toHaveCount(0);
    await expect(host.getByRole('button', { name: /reset/i })).toHaveCount(0);

    await page.getByTestId('call-reset').click();

    await expect(page.getByTestId('reset-calls')).toHaveText('1');
    await expect(name).toBeDisabled();
    await expect(name).toHaveValue('Baseline');
    await expect(description).toHaveValue('Baseline description');
    await expect(page.getByTestId('write-count')).toHaveText('0');
    await expect(page.getByTestId('navigation-count')).toHaveText('0');
    await expect(page.getByTestId('success-count')).toHaveText('0');
  });

  test('AutoForm reset is a no-op when access control denies the form', async ({ page }) => {
    await page.goto('/?view=form-reset&kind=auto&denied');
    const host = productHost(page);
    const denied = host.getByRole('alert');

    await expect(denied).toBeVisible();
    await expect(denied).toContainText('Operation failed');
    await expect(host.getByRole('textbox')).toHaveCount(0);
    await expect(host.getByRole('button', { name: /reset/i })).toHaveCount(0);

    await page.getByTestId('call-reset').click();

    await expect(page.getByTestId('reset-calls')).toHaveText('1');
    await expect(denied).toBeVisible();
    await expect(denied).toContainText('Operation failed');
    await expect(host.getByRole('textbox')).toHaveCount(0);
    await expect(page.getByTestId('write-count')).toHaveText('0');
    await expect(page.getByTestId('navigation-count')).toHaveText('0');
    await expect(page.getByTestId('success-count')).toHaveText('0');
  });

  test('StepsForm reset is a no-op when access control denies the form', async ({ page }) => {
    await page.goto('/?view=form-reset&kind=steps&denied');
    const host = productHost(page);
    const denied = host.getByRole('alert');

    await expect(denied).toBeVisible();
    await expect(denied).toContainText('Operation failed');
    await expect(host.getByRole('textbox')).toHaveCount(0);
    await expect(host.getByRole('button', { name: /reset/i })).toHaveCount(0);

    await page.getByTestId('call-reset').click();

    await expect(page.getByTestId('reset-calls')).toHaveText('1');
    await expect(denied).toBeVisible();
    await expect(denied).toContainText('Operation failed');
    await expect(host.getByRole('textbox')).toHaveCount(0);
    await expect(page.getByTestId('write-count')).toHaveText('0');
    await expect(page.getByTestId('navigation-count')).toHaveText('0');
    await expect(page.getByTestId('success-count')).toHaveText('0');
  });
});