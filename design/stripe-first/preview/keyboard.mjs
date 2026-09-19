import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evidence, root, servePreview } from './run.mjs';

const { chromium, expect } = createRequire(resolve(root, 'package.json'))('@playwright/test');
const results = [];
let server;
let browser;
try {
  server = await servePreview();
  browser = await chromium.launch();
  for (const locale of ['en', 'zh-CN']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await page.goto(`http://127.0.0.1:4179/?view=resource-list&locale=${locale}`, { waitUntil: 'networkidle' });
      const region = page.getByRole('region', { name: locale === 'en' ? 'Customer data' : '客户数据', exact: true });
      await expect(region).toHaveAttribute('tabindex', '0');
      await page.getByRole('textbox', { name: locale === 'en' ? 'Search customers' : '搜索客户' }).focus();
      await page.keyboard.press('Tab');
      await expect(region).toBeFocused();
      const overflow = await region.evaluate(node => node.scrollWidth - node.clientWidth);
      assert.ok(overflow > 0, 'Mobile fixture must exercise real horizontal overflow');
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => region.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
      await expect(region).toHaveCSS('outline-style', 'solid');
      await expect(region).toHaveCSS('outline-width', '2px');
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('open-demo_001')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('specimen')).toHaveAttribute('data-view', 'record-detail');
      await expect(page.getByTestId('specimen')).toBeFocused();
      results.push({ locale, passed: true, overflow });
    } catch (error) { results.push({ locale, passed: false, error: String(error) }); }
    finally { await context.close(); }
  }
} finally {
  await browser?.close();
  if (server) await new Promise(done => server.httpServer.close(done));
  writeFileSync(resolve(evidence, 'keyboard.json'), JSON.stringify(results, null, 2) + '\n');
}
console.info(JSON.stringify({ keyboard: results }));
assert.equal(results.length, 2);
assert.ok(results.every(result => result.passed), 'Keyboard scroll or focus navigation failed');
