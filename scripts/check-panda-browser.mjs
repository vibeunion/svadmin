import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { chromium } from '@playwright/test';

const root = process.cwd();
const output = resolve(root, 'docs/pr-evidence/panda-styles');
mkdirSync(output, { recursive: true });
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const manifest = JSON.parse(read('packages/ui/styles-compatibility.json'));
const baselineCss = Object.keys(manifest.files).map((path) => read(`packages/ui/src/${path}`)).join('\n');
const publishedCss = read('packages/ui/dist/app.css');
const server = await createServer({
  configFile: false,
  root: resolve(root, 'packages/surface/fixtures/panda-styles'),
  plugins: [svelte(), {
    name: 'native-css-evidence',
    configureServer(vite) {
      vite.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith('/__ui.css')) return next();
        const url = new URL(request.url, 'http://localhost');
        response.setHeader('Content-Type', 'text/css');
        response.end(url.searchParams.get('baseline') === '1' ? baselineCss : publishedCss);
      });
    },
  }],
  resolve: { dedupe: ['svelte'] },
  optimizeDeps: { exclude: ['@svadmin/ui', '@svadmin/core', '@svadmin/surface'] },
  server: { host: '127.0.0.1', port: 4177, strictPort: true, fs: { allow: [root] } },
});
const checks = [];
const pageErrors = [];
let browser;
try {
  await server.listen();
  browser = await chromium.launch();
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  async function open(query) {
    await page.goto(`http://127.0.0.1:4177/?${query}`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Tokens, recipes and existing UI' }).waitFor();
    await page.evaluate(() => document.fonts.ready);
  }
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const dark of [0, 1]) {
      const name = `${viewport.width}x${viewport.height}-${dark ? 'dark' : 'light'}`;
      await open(`variants=0&baseline=1&dark=${dark}`);
      const before = await page.screenshot({ animations: 'disabled', caret: 'hide' });
      await open(`variants=0&dark=${dark}`);
      const after = await page.screenshot({ animations: 'disabled', caret: 'hide' });
      assert.ok(before.equals(after), `${name}: published CSS changed default widget/control pixels`);
      await open(`variants=1&dark=${dark}`);
      assert.equal(await page.getByRole('button', { name: 'Disabled action' }).isDisabled(), true);
      assert.equal(await page.locator('article[aria-busy="true"]').count(), 1);
      assert.equal(await page.getByRole('alert').count(), 2);
      const compactPadding = await page.locator('[data-surface-tone="success"] .svadmin-stats-card').first().evaluate((el) => getComputedStyle(el).paddingTop);
      assert.equal(compactPadding, '12px');
      const normalPadding = await page.locator('[data-surface-tone="neutral"] .svadmin-stats-card').evaluate((el) => getComputedStyle(el).paddingTop);
      assert.equal(normalPadding, '20px');
      const tableCell = page.locator('[data-surface-density="compact"] [data-slot="table-cell"]').first();
      assert.equal(await tableCell.evaluate((el) => getComputedStyle(el).paddingTop), '4px');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name}: horizontal overflow`);
      await page.screenshot({ path: resolve(output, `${name}.png`), animations: 'disabled', caret: 'hide' });
      await page.getByText('Advanced details', { exact: true }).click();
      assert.equal(await page.locator('details').evaluate((el) => el.open), true);
      await page.getByText('Advanced details', { exact: true }).click();
      assert.equal(await page.locator('details').evaluate((el) => el.open), false);
      await page.getByRole('button', { name: 'Primary action' }).focus();
      assert.equal(await page.getByRole('button', { name: 'Primary action' }).evaluate((el) => el === document.activeElement), true);
      await page.getByLabel('Attachment', { exact: true }).setInputFiles({ name: 'invoice.csv', mimeType: 'text/csv', buffer: Buffer.from('id,total\n1,42\n') });
      assert.ok((await page.locator('.svadmin-file-input__name').textContent())?.includes('invoice.csv'));
      checks.push({ viewport, mode: dark ? 'dark' : 'light', defaultPixelsIdentical: true, semanticVariants: true, states: true, noHorizontalOverflow: true, controls: true });
    }
  }
  assert.deepEqual(pageErrors, []);
  writeFileSync(resolve(output, 'provenance.json'), `${JSON.stringify({
    testedCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    baselineCommit: manifest.baseCommit,
    publishedCssSha256: createHash('sha256').update(publishedCss).digest('hex'),
    browser: browser.version(),
    scope: 'Actual metric/table/UI control fixture; Chromium only; not a full application or backend authorization test',
    checks,
  }, null, 2)}\n`);
  console.info(`Panda browser compatibility: ${checks.length} viewport/theme cases passed`);
} finally {
  await browser?.close();
  await server.close();
}
