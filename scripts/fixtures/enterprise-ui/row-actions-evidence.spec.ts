import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

test('RowActions surfaces disabled reasons at desktop viewports', async ({ page }) => {
  const directory = resolve(process.cwd(), 'docs/evidence/row-actions-disabled-reason');
  mkdirSync(directory, { recursive: true });
  await page.goto('/?view=row-actions-evidence');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const trigger = page.getByRole('button', { name: '更多操作' });
    if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
    const approve = page.getByRole('menuitem', { name: /审批通过/ });
    await expect(approve).toContainText('缺少电子签名，无法审批。');
    await expect(approve).toHaveAttribute('title', /缺少电子签名/);
    await expect(approve).toBeDisabled();
    await page.screenshot({
      path: resolve(directory, `disabled-reason-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  }
});
