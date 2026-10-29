import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

test('ScrollableTable mirrors horizontal scrolling and exposes keyboard control', async ({ page }) => {
  const directory = resolve(process.cwd(), 'docs/evidence/scrollable-table');
  mkdirSync(directory, { recursive: true });
  await page.goto('/?view=scrollable-table');
  const scrollbar = page.getByRole('scrollbar', { name: '列表横向滚动' });
  await expect(scrollbar).toBeVisible();
  await scrollbar.focus();
  await page.keyboard.press('End');
  await expect(scrollbar).toHaveAttribute('aria-valuenow', /[1-9]/);
  await expect(page.getByRole('cell', { name: '查看' }).last()).toBeInViewport();
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.locator('.evidence-shell').screenshot({
      path: resolve(directory, `scrollable-table-${viewport.width}x${viewport.height}.png`),
    });
  }
});
