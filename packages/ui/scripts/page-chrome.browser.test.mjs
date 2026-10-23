import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ui = fileURLToPath(new URL('../', import.meta.url));
const root = resolve(ui, '../..');
const require = createRequire(join(ui, 'package.json'));
const { build, preview } = await import(require.resolve('vite'));
const { svelte } = await import(require.resolve('@sveltejs/vite-plugin-svelte'));
const { chromium, expect } = require('@playwright/test');
const evidence = resolve(process.env.PAGE_CHROME_EVIDENCE ?? join(root, 'test-results/page-chrome-geometry'));

test('filter toolbar geometry and recovery survive native input styles', { timeout: 120_000 }, async () => {
  mkdirSync(evidence, { recursive: true });
  const work = mkdtempSync(join(evidence, 'fixture-'));
  const report = {
    sources: Object.fromEntries(['src/page-chrome.css', 'src/app.css', 'src/components/content/FilterToolbar.svelte'].map(path => [
      path, createHash('sha256').update(readFileSync(join(ui, path))).digest('hex'),
    ])),
    cases: [],
  };
  let server;
  let browser;
  try {
    writeFileSync(join(work, 'index.html'), '<!doctype html><html lang="en"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page chrome verification</title><div id="app"></div><script type="module" src="/main.js"></script></html>');
    writeFileSync(join(work, 'main.js'), `import { mount } from 'svelte';\nimport ${JSON.stringify(join(ui, 'src/app.css'))};\nimport Fixture from ${JSON.stringify(join(ui, 'test/fixtures/PageChromeGeometry.svelte'))};\nmount(Fixture, { target: document.getElementById('app') });\n`);
    await build({
      configFile: false, root: work, plugins: [svelte({ configFile: false })],
      resolve: { conditions: ['browser'] }, build: { outDir: 'build', emptyOutDir: true }, logLevel: 'warn',
    });
    server = await preview({
      configFile: false, root: work, build: { outDir: 'build' },
      preview: { host: '127.0.0.1', port: 0 }, logLevel: 'warn',
    });
    const address = server.httpServer.address();
    assert.ok(address && typeof address !== 'string');
    browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      for (const direction of ['ltr', 'rtl']) {
        for (const theme of ['light', 'dark']) {
          const page = await browser.newPage({ viewport, locale: 'en-US' });
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          await page.goto(`http://127.0.0.1:${address.port}`);
          const search = page.getByRole('textbox', { name: 'Search orders' });
          await expect(search).toBeVisible();
          await page.evaluate(({ direction, theme }) => {
            document.documentElement.dir = direction;
            document.documentElement.classList.toggle('dark', theme === 'dark');
          }, { direction, theme });
          const clear = page.getByRole('button', { name: 'Clear orders' });
          const toolbar = page.locator('[data-svadmin-filter-toolbar]').first();
          const inspectGeometry = async () => toolbar.evaluate(element => {
            const input = element.querySelector('input');
            const icon = element.querySelector('.svadmin-filter-toolbar__search-icon');
            const button = element.querySelector('.svadmin-filter-toolbar__clear');
            if (!input || !icon || !button) throw new Error('Missing search controls');
            const style = getComputedStyle(input);
            const bounds = input.getBoundingClientRect();
            const leading = icon.getBoundingClientRect();
            const trailing = button.getBoundingClientRect();
            const textLeft = bounds.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
            const textRight = bounds.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
            const rtl = style.direction === 'rtl';
            return {
              leadingGap: rtl ? leading.left - textRight : textLeft - leading.right,
              trailingGap: rtl ? textLeft - trailing.right : trailing.left - textRight,
              height: bounds.height,
              buttonHeight: trailing.height,
              buttonWithinInput: trailing.top >= bounds.top && trailing.bottom <= bounds.bottom,
            };
          });
          const geometry = await inspectGeometry();
          assert.ok(geometry.leadingGap >= 4, `search icon overlaps text: ${JSON.stringify(geometry)}`);
          assert.ok(geometry.trailingGap >= 4, `clear button overlaps text: ${JSON.stringify(geometry)}`);
          assert.equal(geometry.buttonWithinInput, true);
          const referencePadding = await page.getByLabel('Name', { exact: true }).evaluate(input => getComputedStyle(input).paddingInlineStart);
          assert.equal(referencePadding, '12px', 'plain inputs must retain their original padding');
          await clear.click();
          await expect(search).toHaveValue('');
          await expect(search).toBeFocused();
          for (const key of ['Enter', 'Space']) {
            await search.fill('No matching orders');
            await search.press('Tab');
            await expect(clear).toBeFocused();
            await clear.press(key);
            await expect(search).toHaveValue('');
            await expect(search).toBeFocused();
          }
          await page.keyboard.type('new query');
          await expect(search).toHaveValue('new query');
          await expect(page.getByLabel('Orders query')).toHaveText('new query');
          await expect(page.getByRole('textbox', { name: 'Search people' })).toHaveValue('Morgan');
          await expect(page.getByLabel('Owner', { exact: true })).toHaveValue('Casey');
          await expect(page.getByRole('button', { name: 'Filters', exact: true })).toHaveAttribute('aria-expanded', 'true');
          const themedBefore = await inspectGeometry();
          await page.evaluate(() => {
            document.documentElement.style.setProperty('--svadmin-control-h', '44px');
            document.documentElement.style.setProperty('--svadmin-space-3', '16px');
          });
          const themedAfter = await inspectGeometry();
          assert.equal(themedAfter.height, 44);
          assert.ok(themedAfter.leadingGap >= 4 && themedAfter.trailingGap >= 4);
          assert.equal(themedAfter.buttonHeight, themedBefore.buttonHeight);
          assert.equal(themedAfter.buttonWithinInput, true);
          await page.evaluate(() => {
            document.documentElement.style.removeProperty('--svadmin-control-h');
            document.documentElement.style.removeProperty('--svadmin-space-3');
          });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          assert.deepEqual(errors, []);
          if (direction === 'ltr' && theme === 'light') {
            await page.screenshot({ path: join(evidence, `search-geometry-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
          }
          report.cases.push({ viewport, direction, theme, geometry, themedAfter, passed: true });
          await page.close();
        }
      }
    }
    writeFileSync(join(evidence, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  } finally {
    await browser?.close();
    if (server) await new Promise((resolveClose, reject) => server.httpServer.close(error => error ? reject(error) : resolveClose()));
    rmSync(work, { recursive: true, force: true });
  }
});
