import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

test('MoneyInput reads and writes minor units while displaying major units', async ({ page }) => {
  const directory = resolve(process.cwd(), 'docs/evidence/money-minor-units');
  mkdirSync(directory, { recursive: true });
  await page.goto('/?view=numeric');
  const fixture = page.getByTestId('money-minor-fixture');
  const input = fixture.locator('input');
  await expect(input).toHaveValue('12.50');
  await input.fill('1234.50');
  await expect(fixture.getByTestId('minor-value')).toHaveText('123450');
  await expect(fixture.getByTestId('minor-changes')).toHaveText('1');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await fixture.screenshot({
      path: resolve(directory, `money-minor-units-${viewport.width}x${viewport.height}.png`),
    });
  }
});
