import { expect, test } from '@playwright/test';

const templates = [
  { nav: 'Workplace', heading: 'Workplace' },
  { nav: 'Monitor', heading: 'Operations monitor' },
  { nav: 'Analysis', heading: 'Revenue analysis' },
  { nav: 'Search table', heading: 'Search records' },
  { nav: 'Card list', heading: 'Resource library' },
  { nav: 'Group form', heading: 'Create workspace' },
  { nav: 'Step form', heading: 'Create workspace' },
  { nav: 'Advanced form', heading: 'Advanced request' },
  { nav: 'Basic detail', heading: 'Request detail' },
  { nav: 'Advanced detail', heading: 'Case detail' },
  { nav: 'Profile', heading: 'Public profile' },
  { nav: 'Result', heading: 'Workspace published' },
  { nav: 'Exception', heading: 'Access denied' },
];

test('page template gallery renders every composition at desktop and mobile widths', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#/login');
  await page.locator('#login-identifier').fill('demo@example.com');
  await page.locator('#login-password').fill('demo');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/^[^#]+#\/(?:\?[^#]*)?$/);
  await page.goto('/#/templates');

  for (const template of templates) {
    await page.getByRole('button', { name: template.nav, exact: true }).click();
    await expect(page.getByRole('heading', { name: template.heading, exact: true })).toBeVisible();
  }

  await page.screenshot({ path: testInfo.outputPath('templates-desktop.png'), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('templates-mobile.png'), fullPage: true, animations: 'disabled' });
});