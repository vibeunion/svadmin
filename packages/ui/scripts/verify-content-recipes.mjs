import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ui = fileURLToPath(new URL('../', import.meta.url));
const root = resolve(ui, '../..');
const require = createRequire(join(ui, 'package.json'));
const { build, preview } = await import(require.resolve('vite'));
const { svelte } = await import(require.resolve('@sveltejs/vite-plugin-svelte'));
const { chromium } = await import(require.resolve('@playwright/test'));
const baseline = 'ee01ea0b52285bd3129447cd0b2ddb0c114f45ce';
const work = join(ui, '.content-recipe-verification');
const evidence = resolve(process.env.CONTENT_RECIPE_EVIDENCE ?? join(root, 'test-results/content-recipes'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const names = ['ContentPageShell', 'ContentPageHeader', 'MetricBlock'];
const report = { baseline, head: git('rev-parse', 'HEAD'), baselineSources: {}, candidateSources: {}, css: {}, cases: [], errors: [] };
let server;
let browser;
mkdirSync(evidence, { recursive: true });
rmSync(work, { recursive: true, force: true });
mkdirSync(join(work, 'baseline'), { recursive: true });

try {
  for (const name of names) {
    const path = `packages/ui/src/components/content/${name}.svelte`;
    const original = execFileSync('git', ['show', `${baseline}:${path}`], { cwd: root, encoding: 'utf8' });
    report.baselineSources[path] = sha256(original);
    report.candidateSources[path] = sha256(readFileSync(join(root, path)));
    // Baseline components are the actual historical sources. Only relocate the
    // Skeleton import; Shell still resolves the historical Header beside it.
    const relocated = original.replace("'../ui/skeleton/index.js'", "'../../dist/components/ui/skeleton/index.js'");
    writeFileSync(join(work, 'baseline', `${name}.svelte`), relocated);
  }
  const css = readFileSync(join(ui, 'dist/app.css'));
  assert.deepEqual(css, readFileSync(join(ui, 'dist/app.theme.css')), 'public CSS aliases must remain identical');
  report.css.published = sha256(css);
  report.css.recipes = sha256(readFileSync(join(ui, 'src/styles/recipes.css')));

  writeFileSync(join(work, 'index.html'), '<!doctype html><html lang="en"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Content recipe parity</title><div id="app"></div><script type="module" src="/main.js"></script></html>');
  writeFileSync(join(work, 'main.js'), `import { mount } from 'svelte';\nimport '../dist/app.css';\nimport Fixture from './Fixture.svelte';\nmount(Fixture, { target: document.getElementById('app') });\n`);
  writeFileSync(join(work, 'Fixture.svelte'), `<script lang="ts">
  import BaselinePage from './baseline/ContentPageShell.svelte';
  import BaselineHeader from './baseline/ContentPageHeader.svelte';
  import BaselineMetric from './baseline/MetricBlock.svelte';
  import CandidatePage from '../dist/components/content/ContentPageShell.svelte';
  import CandidateHeader from '../dist/components/content/ContentPageHeader.svelte';
  import CandidateMetric from '../dist/components/content/MetricBlock.svelte';
  const params = new URLSearchParams(location.search);
  const initialWidth = params.get('width');
  let width = $state<'narrow' | 'default' | 'wide'>(initialWidth === 'narrow' || initialWidth === 'wide' ? initialWidth : 'default');
  let candidate = $state(false);
  let loading = $state(true);
  let count = $state(0);
  const mode = params.get('theme') === 'dark' ? 'dark' : 'light';
  const nested = params.has('nested');
  const parentMode = nested ? (mode === 'dark' ? 'light' : 'dark') : mode;
  const dir = params.has('rtl') ? 'rtl' : 'ltr';
  const layout = params.has('flat') ? 'layout-clean-flat' : '';
  const Page = $derived(candidate ? CandidatePage : BaselinePage);
  const Header = $derived(candidate ? CandidateHeader : BaselineHeader);
  const Metric = $derived(candidate ? CandidateMetric : BaselineMetric);
</script>
<button id="implementation" onclick={() => candidate = !candidate}>{candidate ? 'candidate' : 'baseline'}</button>
<button id="width" onclick={() => width = width === 'narrow' ? 'wide' : 'narrow'}>Change width</button>
<button id="loading" onclick={() => loading = !loading}>Change loading</button>
<div class={'svadmin-theme ' + parentMode + ' ' + layout} data-theme={parentMode} {dir}>
  <main id="stage" class={'svadmin-theme ' + mode} data-theme={mode}>
    <Page title="Operations overview" eyebrow="Workspace" description="Revenue, reliability and pending approvals" {width} pageId="content-recipe-fixture" class="consumer-page">
      {#snippet actions()}<button data-action onclick={() => count += 1}>Refresh {count}</button>{/snippet}
      <Header title="Service health" eyebrow="Signals" description="A deliberately long explanation that wraps on narrow screens without changing title or action alignment." breadcrumbs={['Workspace', 'Reports']} class="consumer-header">
        {#snippet actions()}<button data-header-action onclick={() => count += 1}>Inspect {count}</button>{/snippet}
      </Header>
      <section class="metric-grid" aria-label="Metrics">
        <Metric label="Completed" value={0} trend="+2" trendTone="positive" detail="No coercion of zero" class="consumer-metric">
          {#snippet icon()}<span>◆</span>{/snippet}
        </Metric>
        <Metric label="Failed" value={32} trend="+4" trendTone="negative" detail="Requires review" />
        <Metric label="Pending" value="126" trend="+3" trendTone="warning" />
        <Metric label="Neutral" value="0" trend="0" trendTone="neutral" />
        <Metric label="Long value" value="VeryLongMetricValueThatMustRemainOnASingleTruncatedLine1234567890" detail="Long explanatory detail wraps independently." />
        <Metric label="Loading" value={42} {loading} trend="Ready" />
      </section>
      <p id="summary">Visible actions: {count}</p>
    </Page>
  </main>
</div>
<style>
  :global(body) { margin: 0; }
  #stage { padding: 24px; color: var(--foreground); background: var(--background); }
  .metric-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
  @media (max-width: 639px) { .metric-grid { grid-template-columns: minmax(0, 1fr); } }
  :global(.consumer-page) { outline-offset: 3px; }
  :global(.consumer-header) { outline-offset: 5px; }
  :global(.consumer-metric) { outline-offset: 7px; }
  [data-action], [data-header-action] { border: 1px solid var(--border); padding: 4px 8px; }
</style>
`);

  await build({ configFile: false, root: work, plugins: [svelte({ configFile: false })], resolve: { conditions: ['browser'] }, build: { outDir: 'build', emptyOutDir: true }, logLevel: 'warn' });
  server = await preview({ configFile: false, root: work, build: { outDir: 'build' }, preview: { host: '127.0.0.1', port: 4187, strictPort: true }, logLevel: 'warn' });
  browser = await chromium.launch();
  const cases = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
    for (const theme of ['light', 'dark']) {
      for (const width of ['narrow', 'default', 'wide']) {
        for (const flat of [false, true]) cases.push({ viewport, theme, width, flat });
      }
      cases.push({ viewport, theme, width: 'default', flat: true, rtl: true });
      cases.push({ viewport, theme, width: 'default', flat: true, nested: true });
    }
  }
  async function stableScreenshot(locator) {
    let previous;
    for (let i = 0; i < 12; i += 1) {
      const current = await locator.screenshot({ animations: 'disabled' });
      if (previous?.equals(current)) return current;
      previous = current;
    }
    throw new Error('Screenshot did not stabilize independently');
  }
  async function snapshot(page) {
    return page.locator('#stage').evaluate((stage) => {
      const properties = ['display', 'flexDirection', 'flexWrap', 'alignItems', 'justifyContent', 'gap', 'color', 'backgroundColor', 'borderColor', 'borderWidth', 'borderStyle', 'borderRadius', 'boxShadow', 'fontSize', 'lineHeight', 'fontWeight', 'letterSpacing', 'fontVariantNumeric', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'minWidth', 'maxWidth', 'overflowX', 'overflowY', 'whiteSpace', 'textOverflow', 'outlineOffset'];
      return [stage, ...stage.querySelectorAll('*')].map((node) => {
        const style = getComputedStyle(node);
        const bounds = node.getBoundingClientRect();
        return { tag: node.tagName, text: node.childElementCount ? null : node.textContent, bounds: [bounds.x, bounds.y, bounds.width, bounds.height], style: Object.fromEntries(properties.map((property) => [property, style[property]])) };
      });
    });
  }
  for (const [index, scene] of cases.entries()) {
    const context = await browser.newContext({ viewport: scene.viewport, colorScheme: scene.theme, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const query = new URLSearchParams({ width: scene.width, theme: scene.theme });
    for (const flag of ['flat', 'rtl', 'nested']) if (scene[flag]) query.set(flag, '1');
    const id = `${index}-${scene.viewport.width}-${scene.theme}-${scene.width}`;
    try {
      await page.goto(`http://127.0.0.1:4187/?${query}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const before = await stableScreenshot(page.locator('#stage'));
      const oldStyles = await snapshot(page);
      await page.locator('#implementation').click();
      assert.equal(await page.locator('#implementation').textContent(), 'candidate');
      const after = await stableScreenshot(page.locator('#stage'));
      const newStyles = await snapshot(page);
      writeFileSync(join(evidence, `${id}-baseline.png`), before);
      writeFileSync(join(evidence, `${id}-candidate.png`), after);
      writeFileSync(join(evidence, `${id}-styles.json`), JSON.stringify({ baseline: oldStyles, candidate: newStyles }, null, 2));
      assert.deepEqual(newStyles, oldStyles, `${id}: computed styles or DOM geometry changed`);
      assert.ok(before.equals(after), `${id}: zero-tolerance PNG comparison failed`);
      assert.equal(await page.locator('[aria-label="Long value"] > p').evaluate((el) => getComputedStyle(el).whiteSpace), 'nowrap');
      assert.equal(await page.locator('[aria-label="Long value"] > p').evaluate((el) => getComputedStyle(el).textOverflow), 'ellipsis');
      await page.locator('[data-action]').click();
      assert.equal(await page.locator('#summary').textContent(), 'Visible actions: 1');
      assert.equal(await page.locator('[data-action]').evaluate((el) => el === document.activeElement), true);
      await page.locator('#loading').click();
      assert.ok((await page.locator('[aria-label="Loading"]').textContent()).includes('42'));
      await page.locator('#width').click();
      const expected = scene.width === 'narrow' ? 92 * 16 : 48 * 16;
      assert.equal(await page.locator('[data-svadmin-content-page]').evaluate((el) => parseFloat(getComputedStyle(el).maxWidth)), expected);
      assert.deepEqual(pageErrors, []);
      report.cases.push({ id, ...scene, passed: true, nodes: newStyles.length, pngSha256: sha256(after) });
    } catch (error) {
      report.cases.push({ id, ...scene, passed: false, error: String(error) });
      report.errors.push(String(error));
    } finally {
      await context.close();
    }
  }
  console.log(JSON.stringify({ cases: report.cases.length, passed: report.cases.filter((entry) => entry.passed).length, failed: report.errors.length }));
  if (report.errors.length) throw new Error(report.errors.join('\n').slice(0, 16000));
} finally {
  writeFileSync(join(evidence, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.httpServer?.close();
  rmSync(work, { recursive: true, force: true });
}
