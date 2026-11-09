import { expect, test } from '@playwright/test';

test('dark color-scheme contract works without JavaScript and keeps switch hit area', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => {
    document.documentElement.dataset.colorScheme = 'dark';
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div id="theme-probe" style="padding:24px;background:var(--background);color:var(--foreground)">
        <button class="svadmin-button svadmin-button--default svadmin-button-size--default">Probe</button>
        <input class="svadmin-input" aria-label="Probe input" />
        <button role="switch" class="svadmin-switch" data-state="checked" aria-label="Probe switch">
          <span class="svadmin-switch-thumb"></span>
        </button>
      </div>`,
    );
  });

  const probe = page.locator('#theme-probe');
  await expect(probe).toBeVisible();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--background').trim())).toBe('#17171A');

  const switchBox = await probe.getByRole('switch').boundingBox();
  expect(switchBox?.width).toBe(36);
  expect(switchBox?.height).toBe(20);
  const hitArea = await probe.getByRole('switch').evaluate((element) => getComputedStyle(element, '::before').inset);
  expect(hitArea).toBe('-8px');

  await page.screenshot({ path: testInfo.outputPath('dark-color-scheme-contract.png'), animations: 'disabled' });
});
