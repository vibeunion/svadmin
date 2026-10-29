import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

test('DetailDrawer renders status, extra and footer in one header', async ({ page }) => {
  const directory = resolve(process.cwd(), 'docs/evidence/detail-drawer-status');
  mkdirSync(directory, { recursive: true });
  await page.goto('/?view=detail-drawer-status');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('执行中')).toBeVisible();
  await expect(dialog.getByText('市场负责人已确认')).toBeVisible();
  await expect(dialog.getByText('共 3 个项目')).toBeVisible();
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await dialog.screenshot({
      path: resolve(directory, `detail-drawer-status-${viewport.width}x${viewport.height}.png`),
    });
  }
});
