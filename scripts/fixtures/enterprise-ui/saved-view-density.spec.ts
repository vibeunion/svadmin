import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

test('SavedListViews persists compact density across reload', async ({ page }) => {
  const directory = resolve(process.cwd(), 'docs/evidence/saved-view-density');
  mkdirSync(directory, { recursive: true });
  await page.goto('/?view=saved-list-views');
  await page.getByRole('button', { name: /density|密度/i }).click();
  await page.getByRole('button', { name: /densityCompact|紧凑/i }).click();
  await expect(page.locator('[data-table-density="compact"]').first()).toBeVisible();

  await page.getByRole('button', { name: /^(Views|视图)$/, exact: true }).click();
  await page.getByLabel(/^(View name|视图名称)$/).fill('Compact saved');
  await page.getByRole('button', { name: /^(Save|保存)$/, exact: true }).click();

  const persisted = await page.evaluate(() => {
    for (const [key, value] of Object.entries(localStorage)) {
      if (!key.startsWith('svadmin-list-views-v2-')) continue;
      const parsed = JSON.parse(value) as { views?: Array<{ name?: string; state?: { density?: string } }> };
      const view = parsed.views?.find(candidate => candidate.name === 'Compact saved');
      if (view) return view.state?.density;
    }
    return undefined;
  });
  expect(persisted).toBe('compact');

  await page.reload();
  await expect(page.locator('[data-table-density="compact"]').first()).toBeVisible();
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.screenshot({
      path: resolve(directory, `density-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  }
});
