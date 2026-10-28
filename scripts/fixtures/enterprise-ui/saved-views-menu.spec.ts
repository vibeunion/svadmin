import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

test('SavedViewsMenu renders reusable saved views at desktop viewports', async ({ page }) => {
  const directory = resolve(process.cwd(), 'docs/evidence/saved-views-menu');
  mkdirSync(directory, { recursive: true });
  await page.goto('/?view=saved-views-menu');
  await page.getByRole('button', { name: 'Views' }).click();
  await expect(page.getByRole('textbox', { name: 'View name' })).toBeVisible();
  await expect(page.getByRole('option', { name: '全部记录' })).toBeAttached();
  await expect(page.getByRole('option', { name: '待复核' })).toBeAttached();
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.screenshot({
      path: resolve(directory, `saved-views-menu-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  }
});
