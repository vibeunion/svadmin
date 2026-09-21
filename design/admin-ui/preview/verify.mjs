import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildPreview, directory, evidence, root, servePreview } from './run.mjs';
import { customers, scenarios } from './model.mjs';
import { captureSpecimen } from './capture.mjs';
import { runtimeSource } from '../build.mjs';

const require = createRequire(resolve(root, 'package.json'));
const { chromium, expect } = require('@playwright/test');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const report = {
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  scope: 'Built Svelte specimens, not production backend integration, Figma parity or WCAG certification',
  capture: { mode: 'full-page', attempts: 8, equality: 'consecutive PNG buffers, byte-for-byte', masks: false, baselineComparison: false },
  figmaSynced: false, sourceHashes: {}, statusContrast: [], scenes: [], interactions: [], failures: [],
};
rmSync(evidence, { force: true, recursive: true });
mkdirSync(resolve(evidence, 'screenshots'), { recursive: true });
for (const file of readdirSync(directory).filter(name => /\.(svelte|css|mjs|js|json)$/u.test(name)).sort()) report.sourceHashes[`design/admin-ui/preview/${file}`] = sha256(readFileSync(resolve(directory, file)));
for (const file of ['packages/ui/dist/app.css', runtimeSource.stylesheet, runtimeSource.recipeSource]) report.sourceHashes[file] = sha256(readFileSync(resolve(root, file)));
let server;
let browser;

async function openScene(options, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const unexpectedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4179' || request.method() !== 'GET') unexpectedRequests.push({ method: request.method(), url: request.url() });
  });
  await page.goto(`http://127.0.0.1:4179/?${new URLSearchParams(options)}`, { waitUntil: 'networkidle' });
  await expect(page.getByTestId('specimen')).toHaveAttribute('data-view', options.view);
  return { context, page, errors, unexpectedRequests };
}
try {
  await buildPreview();
  server = await servePreview();
  browser = await chromium.launch(process.env['SVADMIN_CHROMIUM_EXECUTABLE_PATH'] ? { executablePath: process.env['SVADMIN_CHROMIUM_EXECUTABLE_PATH'] } : {});
  report.browserVersion = browser.version();
  const viewports = [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }];
  for (const viewport of viewports) for (const theme of ['light', 'dark']) for (const locale of ['en', 'zh-CN']) {
    for (const [view, states] of Object.entries(scenarios)) for (const state of states) {
      const options = { view, state, theme, locale };
      const id = `${view}-${state}-${theme}-${locale}-${viewport.width}`;
      const scene = await openScene(options, viewport);
      try {
        const { page } = scene;
        await expect(page.getByTestId('specimen')).toHaveAttribute('data-scenario', state);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'page-level horizontal overflow');
        if (state === 'forbidden') {
          await expect(page.getByTestId('create')).toHaveCount(0);
          await expect(page.getByTestId('specimen')).not.toContainText('billing@aster.example');
          await expect(page.getByTestId('specimen')).not.toContainText('Aster Studio');
        }
        if (view === 'components') {
          await expect(page.getByTestId('input-disabled')).toBeDisabled();
          await expect(page.getByTestId('input-readonly')).toHaveAttribute('readonly', '');
          await expect(page.getByTestId('input-invalid')).toHaveAttribute('aria-describedby', 'invalid-hint');
          const statuses = await page.locator('[data-svadmin-status]').evaluateAll(nodes => {
            // 浏览器将实际解析后的 OKLCH 颜色投影至 sRGB；本样例标签背景为不透明色。
            const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw new Error('Cannot resolve rendered colors');
            const rgb = css => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; };
            const luminance = channels => channels.slice(0, 3).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((total, v, i) => total + v * [0.2126, 0.7152, 0.0722][i], 0);
            return nodes.map(node => {
              const style = getComputedStyle(node); const foreground = rgb(style.color); const background = rgb(style.backgroundColor);
              if (foreground[3] !== 255 || background[3] !== 255) throw new Error('Contrast requires opaque resolved colors');
              const a = luminance(foreground), b = luminance(background);
              return { status: node.getAttribute('data-svadmin-status'), text: node.textContent, foreground, background, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
            });
          });
          assert.deepEqual(statuses.map(item => item.status), ['success', 'warning', 'danger', 'info', 'neutral']);
          for (const item of statuses) { assert.ok(item.text.trim()); assert.ok(item.ratio >= 4.5, `${theme}/${item.status}: insufficient label contrast ${item.ratio}`); }
          report.statusContrast.push({ id, statuses });
        }
        if ((view === 'record-detail' && ['ready', 'partial'].includes(state)) || view === 'settings') {
          const workspace = page.locator('[data-svadmin-workspace-layout]');
          const columns = workspace.locator(':scope > div').last();
          const widths = await columns.evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
          assert.equal(widths, viewport.width >= 1024 ? 2 : 1, 'responsive primary/secondary layout');
          await expect(workspace.locator('[data-svadmin-workspace-secondary]')).toHaveCount(1);
        }
        if (view === 'resource-list' && state === 'ready') {
          await expect(page.locator('tbody tr').first()).toHaveCSS('border-bottom-width', '1px');
          await expect(page.locator('thead th').nth(2)).toHaveCSS('text-align', 'end');
        }
        if (view === 'settings') {
          await expect(page.locator('#settings-developer')).toContainText('•••• •••• 001');
          await expect(page.locator('#settings-developer button')).toHaveCount(0);
        }
        if (view === 'settings') await expect(page.getByTestId('save-state')).toHaveAttribute('data-phase', state);
        if (view === 'settings' && state === 'readonly') await expect(page.getByTestId('save')).toBeDisabled();
        if (view === 'settings' && state === 'saving') await expect(page.getByTestId('workspace-name')).toBeDisabled();
        const capture = await captureSpecimen(page, { id, directory: evidence });
        const filename = `${id}.png`;
        writeFileSync(resolve(evidence, 'screenshots', filename), capture.png);
        // 瞬时状态若已消失，不能把另一状态的截图算作目标状态的通过证据。
        assert.equal(capture.lastFrame?.state.view, view);
        assert.equal(capture.lastFrame?.state.scenario, state);
        if (view === 'settings') assert.equal(capture.lastFrame?.state.phase, state);
        assert.deepEqual(scene.errors, []);
        assert.deepEqual(scene.unexpectedRequests, []);
        report.scenes.push({ id, ...options, viewport, passed: true, screenshot: `screenshots/${filename}`, sha256: sha256(capture.png), captureAttempts: capture.attempts });
      } catch (error) {
        report.scenes.push({ id, ...options, viewport, passed: false, error: String(error) });
        report.failures.push({ id, error: String(error) });
      } finally { await scene.context.close(); }
    }
  }
  for (const viewport of viewports) for (const locale of ['en', 'zh-CN']) {
    const id = `interaction-${locale}-${viewport.width}`;
    const scene = await openScene({ view: 'resource-list', state: 'ready', theme: 'light', locale }, viewport);
    const { page } = scene;
    try {
      const search = page.getByRole('textbox', { name: locale === 'en' ? 'Search customers' : '搜索客户' });
      await page.getByTestId('filter-pending').click();
      await expect(page.getByTestId('filter-pending')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('tbody tr')).toHaveCount(customers.filter(record => record.status === 'pending').length);
      await search.fill('Northstar');
      await expect(page.getByTestId('clear-filters')).toBeVisible();
      await page.getByTestId('clear-status').click();
      await expect(search).toHaveValue('Northstar');
      await expect(page.getByTestId('filter-all')).toHaveAttribute('aria-pressed', 'true');
      await page.getByTestId('filter-active').click();
      await expect(page.getByTestId('count')).toHaveText(/1/u);
      await page.getByTestId('open-demo_002').click();
      await expect(page.getByTestId('specimen')).toContainText('Northstar Lab');
      await page.getByTestId('back').click();
      await expect(search).toHaveValue('Northstar');
      await expect(page.getByTestId('filter-active')).toHaveAttribute('aria-pressed', 'true');
      await page.getByTestId('scenario').selectOption('error');
      await page.getByRole('button', { name: locale === 'en' ? 'Retry' : '重试', exact: true }).click();
      await expect(search).toHaveValue('Northstar');
      await page.getByTestId('theme').selectOption('dark');
      await page.getByTestId('density').selectOption('comfortable');
      await expect(search).toHaveValue('Northstar');
      await search.fill('nonexistent-record');
      await expect(page.getByTestId('clear-filters')).toBeVisible();
      await page.getByTestId('clear-filters').click();
      await expect(page.getByTestId('count')).toHaveText(/4/u);
      await page.getByTestId('allow-create').uncheck();
      await expect(page.getByTestId('create')).toHaveCount(0);
      await page.getByTestId('scenario').selectOption('forbidden');
      await expect(page.getByTestId('specimen')).not.toContainText('Aster Studio');
      await expect(page.getByTestId('filter-all')).toHaveCount(0);

      await page.getByTestId('nav-components').click();
      await page.getByTestId('input-default').fill('保持输入 · retained');
      await page.getByTestId('input-default').focus();
      await expect(page.getByTestId('input-default')).toBeFocused();
      const focused = await captureSpecimen(page, { id: `${id}-focus`, directory: evidence });
      writeFileSync(resolve(evidence, 'screenshots', `${id}-focus.png`), focused.png);
      await expect(page.getByTestId('input-default')).toBeFocused();
      await page.getByTestId('input-file').setInputFiles({ name: 'customers.csv', mimeType: 'text/csv', buffer: Buffer.from('name\nAster\n') });
      await expect(page.locator('.svadmin-file-input__name')).toHaveText('customers.csv');
      await page.getByTestId('theme').selectOption('light');
      await expect(page.getByTestId('input-default')).toHaveValue('保持输入 · retained');

      await page.getByTestId('nav-settings').click();
      await page.getByTestId('workspace-name').fill('Changed workspace');
      await expect(page.getByTestId('save')).toBeEnabled();
      await page.getByTestId('fail-save').check();
      await page.getByTestId('save').click();
      await expect(page.getByTestId('save-state')).toHaveAttribute('data-phase', 'error');
      await expect(page.getByTestId('workspace-name')).toHaveValue('Changed workspace');
      await page.getByTestId('fail-save').uncheck();
      await page.getByTestId('save').click();
      await expect(page.getByTestId('save-state')).toHaveAttribute('data-phase', 'saved');
      await expect(page.getByTestId('save-state').getByRole('status')).toHaveCount(1);
      await expect(page.getByTestId('save-state')).toHaveAttribute('data-phase', 'ready', { timeout: 5000 });
      await expect(page.getByTestId('save-state').getByRole('status')).toHaveCount(0);
      await page.getByTestId('workspace-name').fill('');
      await page.getByTestId('save').click();
      await expect(page.getByTestId('workspace-name')).toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator('#name-error')).toBeVisible();
      await expect(page.getByTestId('billing-email')).toHaveValue('billing@aster.example');
      await page.getByTestId('scenario').selectOption('readonly');
      await expect(page.getByTestId('workspace-name')).toHaveAttribute('readonly', '');
      await expect(page.getByTestId('save')).toBeDisabled();
      assert.deepEqual(scene.errors, []);
      assert.deepEqual(scene.unexpectedRequests, []);
      report.interactions.push({ id, passed: true });
    } catch (error) {
      report.interactions.push({ id, passed: false, error: String(error) });
      report.failures.push({ id, error: String(error) });
    } finally { await scene.context.close(); }
  }
} catch (error) { report.failures.push({ id: 'setup', error: String(error) }); }
finally {
  await browser?.close();
  if (server) await new Promise(resolveClose => server.httpServer.close(resolveClose));
  writeFileSync(resolve(evidence, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  const passed = report.scenes.filter(scene => scene.passed);
  writeFileSync(resolve(evidence, 'index.html'), '<!doctype html><meta charset="UTF-8"><title>svadmin browser specimens</title><h1>svadmin · Browser specimens</h1><p>Actual built components. Full-page captures; not synchronized to Figma. See report.json for exact revision and scope.</p>' + passed.map(scene => `<details><summary>${scene.id}</summary><img style="max-width:100%;height:auto" src="${scene.screenshot}" alt="${scene.id}"></details>`).join('\n'));
  console.info(JSON.stringify({ revision: report.revision, scenes: report.scenes.length, passed: passed.length, interactions: report.interactions.filter(item => item.passed).length, failures: report.failures }));
}
assert.equal(report.scenes.length, 228, 'complete finite state matrix must run');
assert.equal(report.interactions.length, 6, 'all interaction sequences must run');
assert.equal(report.failures.length, 0, 'browser specimen checks failed; see report.json');
