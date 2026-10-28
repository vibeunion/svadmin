import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

test('RowActions surfaces disabled reasons outside a clipped row', async ({ page }) => {
  const directory = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/evidence/row-actions-portaled-menu');
  mkdirSync(directory, { recursive: true });
  await page.goto('/?view=row-actions-evidence');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const trigger = page.getByRole('button', { name: '更多操作' });
    if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
    const menu = page.getByRole('menu', { name: '更多操作' });
    const approve = page.getByRole('menuitem', { name: /审批通过/ });
    await expect(approve).toContainText('缺少电子签名，无法审批。');
    await expect(approve).toHaveAttribute('title', /缺少电子签名/);
    await expect(approve).toBeDisabled();
    await expect(menu).toBeVisible();
    await expect.poll(() => menu.evaluate((node) => ({
      parentIsBody: node.parentElement === document.body,
      position: getComputedStyle(node).position,
      clipped: node.closest('[data-testid="row-actions-clip"]') !== null,
    }))).toEqual({ parentIsBody: true, position: 'fixed', clipped: false });
    await page.screenshot({
      path: resolve(directory, `portaled-menu-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  }
});
