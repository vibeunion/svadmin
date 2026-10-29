import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

test('CopyButton reports copied state and disables empty values', async ({ page, context }) => {
  const directory = resolve(process.cwd(), 'docs/evidence/copy-button');
  mkdirSync(directory, { recursive: true });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?view=copy-button');
  const first = page.getByRole('button', { name: '复制完整编号' });
  await first.click();
  await expect(first).toHaveAttribute('data-state', 'copied');
  await expect(page.getByRole('status').filter({ hasText: '已复制完整编号' })).toHaveText('已复制完整编号');
  await expect(page.getByRole('button', { name: '复制空编号' })).toBeDisabled();
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.locator('.evidence-shell').screenshot({
      path: resolve(directory, `copy-button-${viewport.width}x${viewport.height}.png`),
    });
  }
});
