import { expect, test } from '@playwright/test';

const cases = ['internal-ref', 'external-ref', 'one-of', 'unknown-keyword'] as const;

for (const scenario of cases) {
  test(`unsupported schema stays closed without business callbacks: ${scenario}`, async ({ page }) => {
    const pageErrors: string[] = [];
    const remoteRequests: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.route('https://schemas.example.invalid/**', async route => {
      remoteRequests.push(route.request().url());
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto(`/?view=schema-unsupported&case=${scenario}`);
    await expect(page.getByTestId('schema-unsupported-fixture')).toHaveAttribute('data-case', scenario);
    const form = page.getByTestId('json-schema-form');
    const alert = form.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText('Check the form input.');
    expect(await form.locator('input, select, textarea').count()).toBe(0);
    expect(await form.locator('input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])').count()).toBe(0);
    const submit = form.getByRole('button', { name: 'Submit', exact: true });
    await expect(submit).toBeDisabled();

    await form.evaluate(element => {
      element.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
      (element as HTMLFormElement).requestSubmit();
    });
    await page.waitForTimeout(200);
    await expect(page.getByTestId('unsupported-submissions')).toHaveText('0');
    expect(remoteRequests).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}