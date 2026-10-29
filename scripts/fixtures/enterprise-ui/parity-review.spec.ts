import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

test.beforeEach(async ({ page }) => { await page.goto('/parity-review.html'); });

test('menu arrows and flyouts keep selection separate from navigation', async ({ page }) => {
  const keyboard = page.getByRole('region', { name: 'Keyboard menu' });
  const reports = keyboard.getByRole('button', { name: 'Reports', exact: true });
  await reports.focus();
  await page.keyboard.press('ArrowRight');
  await expect(reports).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-selection-count]')).toHaveText('0');
  await page.keyboard.press('ArrowRight');
  await expect(keyboard.getByRole('button', { name: 'Weekly' })).toBeFocused();

  const collapsed = page.getByRole('region', { name: 'Collapsed menu' });
  const parent = collapsed.getByRole('button', { name: 'Reports', exact: true });
  await page.getByRole('heading', { name: 'Parity interaction regression' }).hover();
  await parent.hover();
  await expect(parent).toHaveAttribute('aria-expanded', 'true');
  const child = collapsed.getByRole('button', { name: 'Weekly', exact: true });
  await child.hover();
  await expect(child).toBeVisible();
  await page.getByRole('heading', { name: 'Parity interaction regression' }).hover();
  await expect(parent).toHaveAttribute('aria-expanded', 'false');
  await parent.focus();
  await page.keyboard.press('ArrowRight');
  await expect(child).toBeFocused();
  await expect(page.locator('[data-selection-count]')).toHaveText('0');
});

test('tour traps initial reverse tab and restores focus and scroll', async ({ page }) => {
  const start = page.getByRole('button', { name: 'Start tour' });
  await start.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Next' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Skip', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(start).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('nested breakpoints remain local and line info stays inside its visible layout', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const outer = page.locator('.outer-grid');
  const inner = page.locator('.inner-grid');
  await expect.poll(() => outer.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(4);
  await expect.poll(() => inner.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
  await expect(page.locator('.inner-col')).toHaveCSS('grid-column-start', 'auto');
  await expect(page.locator('.inner-col')).toHaveCSS('grid-column-end', 'span 24');
  const progress = page.getByRole('progressbar', { name: 'Line progress' });
  const info = progress.getByText('35%');
  const parentBox = await progress.boundingBox();
  const infoBox = await info.boundingBox();
  expect(parentBox).not.toBeNull();
  expect(infoBox).not.toBeNull();
  if (!parentBox || !infoBox) throw new Error('Progress info must have a visible layout');
  expect(infoBox.y).toBeGreaterThanOrEqual(parentBox.y);
  expect(infoBox.y + infoBox.height).toBeLessThanOrEqual(parentBox.y + parentBox.height + 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => inner.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
});

test('vertical resize values, config overrides and notification actions work', async ({ page }) => {
  const handle = page.getByRole('separator', { name: /Vertical panel/ });
  await expect(handle).toHaveAttribute('aria-valuenow', '200');
  await handle.focus();
  await page.keyboard.press('ArrowDown');
  await expect(handle).toHaveAttribute('aria-valuenow', '204');
  await handle.dblclick();
  await expect(handle).toHaveAttribute('aria-valuenow', '200');
  await expect(page.getByRole('button', { name: 'Inherited size' })).toHaveAttribute('data-size', 'sm');
  await expect(page.getByRole('button', { name: 'Explicit size' })).toHaveAttribute('data-size', 'lg');
  await page.getByRole('button', { name: 'Notify', exact: true }).click();
  await page.getByRole('button', { name: 'Undo review' }).click();
  await expect(page.locator('[data-action-count]')).toHaveText('1');
  await expect(page.getByText('Review saved')).toHaveCount(0);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  test(`parity evidence ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.getByRole('button', { name: 'Notify', exact: true }).click();
    await expect(page.getByText('Review saved')).toBeVisible();
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const directory = resolve(process.cwd(), 'docs/evidence/pr-598');
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: resolve(directory, `parity-${viewport.width}x${viewport.height}.png`), fullPage: false, animations: 'disabled' });
  });
}
