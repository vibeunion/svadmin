import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

test('disabled Button falls back to title while enabled title stays a native hint', async ({ page }) => {
  const directory = resolve(process.cwd(), 'docs/evidence/button-title-fallback');
  mkdirSync(directory, { recursive: true });
  await page.goto('/?view=button-title-fallback');
  const buttons = page.locator('.evidence-row button');
  await expect(buttons.nth(0)).toBeDisabled();
  await expect(buttons.nth(0)).toHaveAttribute('title', '选择客户后才能创建委托单。');
  await expect(buttons.nth(1)).toHaveAttribute('data-slot', 'button');
  await expect(buttons.nth(2)).toBeEnabled();
  await page.locator('[data-slot="button-restriction"]').first().hover();
  await expect(page.getByRole('tooltip')).toContainText('选择客户后才能创建委托单。');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.locator('.evidence-shell').screenshot({
      path: resolve(directory, `button-title-fallback-${viewport.width}x${viewport.height}.png`),
    });
  }
});
