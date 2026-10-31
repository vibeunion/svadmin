import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

test.use({ locale: 'zh-CN' });

test('DataTableShell renders the titled table surface with toolbar and sticky actions', async ({ page }) => {
  const directory = resolve(process.cwd(), 'docs/evidence/data-table-shell');
  mkdirSync(directory, { recursive: true });
  await page.goto('/?view=data-table-shell');
  const shell = page.getByRole('region', { name: '委托单列表' });
  await expect(shell.getByRole('heading', { name: '委托单' })).toBeVisible();
  await expect(shell.getByText('共 128 条')).toBeVisible();
  await expect(shell.getByRole('button', { name: '导出' })).toBeVisible();
  await expect(shell.getByText('FA-2026-003')).toBeVisible();
  await page.setViewportSize({ width: 900, height: 720 });
  await page.evaluate(() => {
    const viewport = document.querySelector<HTMLElement>('[data-slot="data-table-shell-viewport"]');
    if (viewport) viewport.scrollLeft = viewport.scrollWidth;
  });
  await expect(shell.getByRole('button', { name: '查看' }).last()).toBeInViewport();
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.locator('.evidence-shell').screenshot({
      path: resolve(directory, `data-table-shell-${viewport.width}x${viewport.height}.png`),
    });
  }
});
