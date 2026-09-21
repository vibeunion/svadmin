import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { chromium } from '@playwright/test';
import { stableScreenshot } from './stable-screenshot.mjs';
import { verifyPrimitiveFallbacks } from './ui-fallback-evidence.mjs';
import { createMigrationReference, lightTokenMigration } from './ui-browser-migration-reference.mjs';

const root = process.cwd();
const output = resolve(root, 'test-results/ui-styles');
mkdirSync(output, { recursive: true });
// Never upload screenshots left over from a different commit after a failed case.
for (const file of readdirSync(output)) {
  if (/^\d+x\d+-(light|dark)(-(baseline|reference|published))?\.(png|json)$/.test(file)
    || /^fallback-.*\.png$/.test(file)
    || ['provenance.json', 'results.json', 'conditional-styles.json', 'fallback-contrast.json'].includes(file)) {
    rmSync(resolve(output, file));
  }
}
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const manifest = JSON.parse(read('packages/ui/styles-compatibility.json'));
const baselineSources = Object.entries(manifest.files).map(([path, historicalSha256]) => {
  const css = read(`packages/ui/test/style-baselines/${path}`);
  return { path, historicalSha256, actualSha256: createHash('sha256').update(css).digest('hex'), css };
});
const baselineCss = baselineSources.map(({ css }) => css).join('\n');
const referenceCss = createMigrationReference(baselineCss);
const publishedCss = read('packages/ui/dist/app.css');
const server = await createServer({
  configFile: false,
  root: resolve(root, 'packages/surface/fixtures/native-styles'),
  plugins: [svelte(), {
    name: 'native-css-evidence',
    configureServer(vite) {
      vite.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith('/__ui.css')) return next();
        const url = new URL(request.url, 'http://localhost');
        response.setHeader('Content-Type', 'text/css');
        response.setHeader('Cache-Control', 'no-store');
        response.end(url.searchParams.get('baseline') === '1' ? baselineCss :
          url.searchParams.get('reference') === '1' ? referenceCss : publishedCss);
      });
    },
  }],
  resolve: { dedupe: ['svelte'] },
  optimizeDeps: { exclude: ['@svadmin/ui', '@svadmin/core', '@svadmin/surface'] },
  server: { host: '127.0.0.1', port: 4177, strictPort: true, fs: { allow: [root] } },
});
const checks = [];
const pageErrors = [];
const failures = [];
// Precision-oriented, single-threaded CPU rasterization for this screenshot fixture only.
// Application E2E and conditional-style checks still launch unmodified Chromium.
// Upstream diagnosis: https://issues.chromium.org/issues/40039960
const screenshotLaunchArgs = [
  '--disable-skia-runtime-opts',
  '--disable-gpu',
  '--disable-partial-raster',
  '--num-raster-threads=1',
];
let browser;
try {
  await server.listen();
  browser = await chromium.launch({
    args: screenshotLaunchArgs,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  async function open(viewport, query) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    page.setDefaultTimeout(15_000);
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(`http://127.0.0.1:4177/?${query}`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Tokens, recipes and existing UI' }).waitFor();
    await page.mouse.move(0, 0);
    await page.evaluate(async () => {
      history.scrollRestoration = 'manual';
      await document.fonts.ready;
      window.scrollTo(0, 0);
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    });
    return page;
  }
  async function capture(page, name) {
    let previous;
    let image;
    let stable = false;
    for (let frame = 0; frame < 4; frame++) {
      image = await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
      if (previous?.equals(image)) { stable = true; break; }
      previous = image;
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    }
    writeFileSync(resolve(output, `${name}.png`), image);
    assert.ok(stable, `${name}: screenshot did not stabilize across consecutive frames`);
    const styles = await page.evaluate(() => [...document.querySelectorAll('body *')].map((el) => {
      const css = getComputedStyle(el);
      const bounds = el.getBoundingClientRect();
      return { tag: el.tagName, class: el.getAttribute('class'), bounds: [bounds.x, bounds.y, bounds.width, bounds.height],
        color: css.color, background: css.backgroundColor, border: css.border, padding: css.padding,
        shadow: css.boxShadow, opacity: css.opacity, font: css.font, display: css.display };
    }));
    writeFileSync(resolve(output, `${name}.json`), `${JSON.stringify(styles, null, 2)}\n`);
    return { image, styles };
  }
  async function compareStylesheets(viewport, dark, name) {
    // Change only CSS, keeping the DOM, browser context and raster cache constant.
    // Separate fresh pages are still used for later interactive state tests.
    const page = await open(viewport, `variants=0&baseline=1&dark=${dark}`);
    try {
      await capture(page, `${name}-baseline`);
      async function replaceStylesheet(query) {
        await page.evaluate(async (query) => {
          const link = document.querySelector('link[rel="stylesheet"][href^="/__ui.css"]');
          if (!(link instanceof HTMLLinkElement)) throw new Error('Missing comparison stylesheet');
          await new Promise((resolve, reject) => {
            link.onload = () => resolve();
            link.onerror = () => reject(new Error('Published stylesheet failed to load'));
            link.href = `/__ui.css?${query}`;
          });
          if (link.href.includes('baseline=1')) throw new Error('Baseline stylesheet was not replaced');
          await document.fonts.ready;
          window.scrollTo(0, 0);
          await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
        }, query);
      }
      await replaceStylesheet(`variants=0&reference=1&dark=${dark}`);
      const reference = await capture(page, `${name}-reference`);
      await replaceStylesheet(`variants=0&dark=${dark}`);
      const after = await capture(page, `${name}-published`);
      assert.deepEqual(after.styles, reference.styles, `${name}: published CSS exceeded the finite token migration reference`);
      assert.ok(reference.image.equals(after.image), `${name}: published screenshot differs from the finite token migration reference`);
    } finally { await page.close(); }
  }
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
    for (const dark of [0, 1]) {
      const name = `${viewport.width}x${viewport.height}-${dark ? 'dark' : 'light'}`;
      let page;
      try {
        await compareStylesheets(viewport, dark, name);
        page = await open(viewport, `variants=1&dark=${dark}`);
        assert.equal(await page.getByRole('button', { name: 'Disabled action' }).isDisabled(), true);
        assert.equal(await page.locator('article[aria-busy="true"]').count(), 1);
        assert.equal(await page.getByRole('alert').count(), 2);
        const compactPadding = await page.locator('[data-surface-tone="success"] .svadmin-stats-card').first().evaluate((el) => getComputedStyle(el).paddingTop);
        assert.equal(compactPadding, '12px');
        const normalPadding = await page.locator('[data-surface-tone="neutral"] .svadmin-stats-card').first().evaluate((el) => getComputedStyle(el).paddingTop);
        assert.equal(normalPadding, '20px');
        const tableCell = page.locator('[data-surface-density="compact"] [data-slot="table-cell"]').first();
        assert.equal(await tableCell.evaluate((el) => getComputedStyle(el).paddingTop), '4px');
        assert.equal(await tableCell.evaluate((el) => getComputedStyle(el).fontSize), '12px');
        const metricState = page.locator('#state-error-label').locator('..').locator('[role="alert"]');
        const stateStyle = await metricState.evaluate((el) => {
          const style = getComputedStyle(el);
          const probe = document.createElement('span');
          probe.style.color = 'var(--info)';
          el.append(probe);
          const expected = getComputedStyle(probe).color;
          probe.remove();
          return { width: style.borderInlineStartWidth, color: style.borderInlineStartColor, expected, padding: style.paddingTop, height: style.minHeight };
        });
        assert.equal(stateStyle.width, '3px');
        assert.equal(stateStyle.color, stateStyle.expected);
        assert.equal(stateStyle.padding, '12px');
        assert.equal(stateStyle.height, '72px');
        const nested = page.getByRole('region', { name: 'Nested theme' }).locator('.svadmin-stats-card');
        const nestedStyle = await nested.evaluate((el) => {
          const probe = document.createElement('span');
          probe.style.color = 'var(--success)';
          el.append(probe);
          const expected = getComputedStyle(probe).color;
          probe.remove();
          return { actual: getComputedStyle(el).borderInlineStartColor, expected };
        });
        assert.equal(nestedStyle.actual, nestedStyle.expected);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name}: horizontal overflow`);
        const image = await stableScreenshot(() => page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' }));
        writeFileSync(resolve(output, `${name}.png`), image);
        await page.getByText('Advanced details', { exact: true }).click();
        assert.equal(await page.locator('details').evaluate((el) => el.open), true);
        await page.getByText('Advanced details', { exact: true }).click();
        assert.equal(await page.locator('details').evaluate((el) => el.open), false);
        await page.getByRole('button', { name: 'Primary action' }).focus();
        assert.equal(await page.getByRole('button', { name: 'Primary action' }).evaluate((el) => el === document.activeElement), true);
        await page.getByLabel('Attachment', { exact: true }).setInputFiles({ name: 'invoice.csv', mimeType: 'text/csv', buffer: Buffer.from('id,total\n1,42\n') });
        assert.ok((await page.locator('.svadmin-file-input__name').textContent())?.includes('invoice.csv'));
        checks.push({ viewport, mode: dark ? 'dark' : 'light', migrationReferenceScreenshotsIdentical: true, semanticVariants: true, states: true, nestedTheme: true, noHorizontalOverflow: true, controls: true });
      } catch (error) {
        failures.push({ name, error: String(error) });
        console.error(`${name}: ${error}`);
      } finally { await page?.close(); }
    }
  }
  try {
    await verifyPrimitiveFallbacks(browser, { 'app.css': publishedCss, 'app.theme.css': read('packages/ui/dist/app.theme.css') }, output);
  } catch (error) {
    failures.push({ name: 'primitive-fallbacks', error: String(error) });
    console.error(`primitive-fallbacks: ${error}`);
  }
  const result = {
    testedCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    baselineCommit: manifest.baseCommit,
    baselineSources: baselineSources.map(({ path, historicalSha256, actualSha256 }) => ({
      path, historicalSha256, actualSha256, matchesHistoricalBytes: historicalSha256 === actualSha256,
    })),
    baselineHashScope: 'Manifest hashes describe historical bytes; actual hashes identify the current comparison files. A mismatch is not evidence of comment-only equivalence.',
    publishedCssSha256: createHash('sha256').update(publishedCss).digest('hex'),
    migrationReferenceCssSha256: createHash('sha256').update(referenceCss).digest('hex'),
    lightTokenMigration,
    browser: browser.version(),
    screenshotLaunchArgs,
    comparison: 'Original baseline retained; independent reference changes only eleven approved light base tokens. Same DOM; two stable frames; exact reference/candidate PNG and computed-style equality.',
    scope: 'Current real Svelte widget/control fixture under baseline, migration reference and published CSS; Chromium only; not full application or unchanged historical appearance certification',
    checks, failures, pageErrors,
  };
  writeFileSync(resolve(output, 'results.json'), `${JSON.stringify(result, null, 2)}\n`);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(failures, []);
  assert.equal(checks.length, 6);
  writeFileSync(resolve(output, 'provenance.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.info(`UI browser compatibility: ${checks.length} viewport/theme cases passed`);
} finally {
  await browser?.close();
  await server.close();
}
