import { expect, test } from '@playwright/test';

// First visit to a lazy route can wait for Vite to compile new modules in dev.
const LAZY_ROUTE_TIMEOUT = 30_000;

const templates: { nav: string; heading: string; path?: string }[] = [
  { nav: 'Workplace', heading: 'Workplace' },
  { nav: 'Monitor', heading: 'Operations monitor' },
  { nav: 'Analysis', heading: 'Revenue analysis' },
  { nav: 'Multi-dimension', heading: 'Multi-dimension analysis', path: 'analysis-multi' },
  { nav: 'Search table', heading: 'Search records' },
  { nav: 'Card list', heading: 'Resource library' },
  { nav: 'Group form', heading: 'Create workspace' },
  { nav: 'Step form', heading: 'Create workspace' },
  { nav: 'Advanced form', heading: 'Advanced request' },
  { nav: 'Basic detail', heading: 'Request detail' },
  { nav: 'Advanced detail', heading: 'Case detail' },
  { nav: 'Profile', heading: 'Public profile' },
  { nav: 'User info', heading: 'Alex Chen' },
  { nav: 'User settings', heading: 'User settings' },
  { nav: 'Result', heading: 'Workspace published' },
  { nav: 'Result error', heading: 'Publish failed' },
  { nav: 'Exception 403', heading: 'Access denied', path: 'exception' },
  { nav: 'Exception 404', heading: 'Page not found' },
  { nav: 'Exception 500', heading: 'Service unavailable' },
];

const pageDepthChecks: Record<string, string> = {
  Workplace: 'Shortcuts',
  Monitor: 'Quick operations',
  'Search table': 'Add record',
  'Card list': '+ Add card',
  'Basic detail': 'Adjustment history',
};

test('page template gallery renders every composition at desktop and mobile widths', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/login');
  await page.locator('#login-identifier').fill('demo@example.com');
  await page.locator('#login-password').fill('demo');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/^[^#]+#\/(?:\?[^#]*)?$/);
  await page.goto('/#/templates');

  for (const template of templates) {
    const path = template.path ?? template.nav.toLowerCase().replaceAll(' ', '-');
    await page.getByRole('button', { name: template.nav, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#/templates/${path}`));
    await expect(page.getByRole('heading', { name: template.heading, exact: true }).first()).toBeVisible();
    const depthText = pageDepthChecks[template.nav];
    if (depthText) await expect(page.getByText(depthText, { exact: true }).first()).toBeVisible();
  }

  for (const template of templates) {
    const path = template.path ?? template.nav.toLowerCase().replaceAll(' ', '-');
    await page.goto(`/#/templates/${path}`);
    await expect(page.getByRole('heading', { name: template.heading, exact: true }).first()).toBeVisible({ timeout: LAZY_ROUTE_TIMEOUT });
    await expect(page.getByRole('link', { name: /All page templates/ })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Template navigation' })).toHaveCount(0);
  }

  await page.screenshot({ path: testInfo.outputPath('parity-1440x900.png'), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: testInfo.outputPath('parity-1920x1080.png'), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('templates-mobile.png'), fullPage: true, animations: 'disabled' });
});
test('standalone template routes expose real business content', async ({ page }) => {
  await page.goto('/#/login');
  await page.locator('#login-identifier').fill('demo@example.com');
  await page.locator('#login-password').fill('demo');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/^[^#]+#\/(?:\?[^#]*)?$/);

  await page.goto('/#/templates/search-table');
  await expect(page.getByRole('heading', { name: 'Search records', exact: true })).toBeVisible({ timeout: LAZY_ROUTE_TIMEOUT });
  await expect(page.getByText('Northwind renewal')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Records' })).toBeVisible();

  await page.goto('/#/templates/profile');
  await expect(page.getByRole('heading', { name: 'Public profile', exact: true })).toBeVisible({ timeout: LAZY_ROUTE_TIMEOUT });
  await expect(page.getByText('Avery Chen').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /All page templates/ })).toBeVisible();
});

test('dock workspace renders panels and restores a saved layout', async ({ page }) => {
  await page.goto('/#/login');
  await page.locator('#login-identifier').fill('demo@example.com');
  await page.locator('#login-password').fill('demo');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/^[^#]+#\/(?:\?[^#]*)?$/);

  await page.goto('/#/workspace/dock');
  await expect(page.getByRole('heading', { name: 'Operations workspace', exact: true })).toBeVisible({ timeout: LAZY_ROUTE_TIMEOUT });
  await expect(page.getByText('Availability')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Resources' })).toBeVisible();
  await page.getByRole('tab', { name: 'Resources' }).click();
  await expect(page.getByText('Platform')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Operations workspace', exact: true })).toBeVisible({ timeout: LAZY_ROUTE_TIMEOUT });
  await expect(page.getByText('Availability')).toBeVisible();
});
