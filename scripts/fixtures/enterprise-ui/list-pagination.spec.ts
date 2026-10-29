import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

test('ListFooter renders controlled pagination and truncation guidance', async ({ page }) => {
  const directory = resolve(process.cwd(), 'docs/evidence/list-pagination');
  mkdirSync(directory, { recursive: true });
  await page.goto('/?view=list-pagination');
  const footer = page.locator('.evidence-panel').first();
  await expect(footer.getByRole('navigation', { name: '委托单分页导航' })).toBeVisible();
  await expect(footer.getByRole('button', { name: '委托单第 2 页' })).toBeDisabled();
  await footer.getByRole('button', { name: '委托单第 3 页' }).click();
  await expect(footer.getByRole('button', { name: '委托单第 3 页' })).toBeDisabled();
  await expect(page.getByText('结果较多，仅加载前 2500 条，请用筛选收窄范围。')).toBeVisible();
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.locator('.evidence-shell').screenshot({
      path: resolve(directory, `list-pagination-${viewport.width}x${viewport.height}.png`),
    });
  }
});
