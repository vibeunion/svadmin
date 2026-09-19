import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { chromium, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const repository = resolve(root, '../..');
const output = join(repository, 'test-results/surface-evidence');
mkdirSync(output, { recursive: true });
// 只用 Svelte 插件，消费构建后的包和预编译 CSS；不配置 Panda/Tailwind 插件。
const server = await createServer({
  configFile: false, root: join(root, 'evidence'), plugins: [svelte()],
  server: { host: '127.0.0.1', port: 5187, strictPort: true, fs: { allow: [repository] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true });
const evidence = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim(),
  browser: browser.version(), compilerPlugins: ['svelte'], hashes: {}, cases: [] };
for (const file of ['src/components/SurfaceEditPreview.svelte', 'src/components/SurfaceRenderer.svelte', 'panda.config.ts', 'src/styles/editor.css']) {
  evidence.hashes[file] = createHash('sha256').update(readFileSync(join(root, file))).digest('hex');
}
try {
  for (const config of [
    { width: 1440, height: 900, theme: 'light', density: 'comfortable' },
    { width: 1920, height: 1080, theme: 'dark', density: 'compact' },
    { width: 390, height: 900, theme: 'light', density: 'compact' },
  ]) {
    const page = await browser.newPage({ viewport: { width: config.width, height: config.height } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:5187/?theme=${config.theme}&density=${config.density}`);
    await expect(page.getByRole('heading', { name: 'Order overview' })).toBeVisible();
    await expect(page.getByTestId('query-count')).toHaveText('1');
    const input = page.getByRole('textbox', { name: 'Reviewer note' });
    await input.fill('Unsaved reviewer note');
    const handle = await input.elementHandle();
    const preview = page.getByRole('button', { name: 'Preview changes' });
    await preview.focus();
    expect(await preview.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
    await preview.click();
    await expect(page.getByRole('heading', { name: 'Orders — revised' })).toBeVisible();
    await expect(input).toHaveValue('Unsaved reviewer note');
    expect(await input.evaluate((element, previous) => element === previous, handle)).toBe(true);
    await expect(page.getByTestId('query-count')).toHaveText('1');
    await expect(page.getByTestId('apply-count')).toHaveText('0');
    const panel = page.locator('.svadmin-surface-editor');
    expect(await panel.evaluate((element) => getComputedStyle(element).paddingTop)).toBe(config.density === 'compact' ? '12px' : '16px');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow).toBe(false);
    await page.screenshot({ path: join(output, `${config.width}-${config.theme}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Back to current' }).click();
    await expect(page.getByRole('heading', { name: 'Order overview' })).toBeVisible();
    await page.getByRole('button', { name: 'Apply changes' }).click();
    await expect(page.getByRole('heading', { name: 'Orders — revised' })).toBeVisible();
    await expect(page.getByTestId('apply-count')).toHaveText('1');
    await expect(page.getByTestId('query-count')).toHaveText('1');
    await expect(input).toHaveValue('Unsaved reviewer note');
    await page.getByRole('button', { name: 'Receive stream' }).click();
    await expect(page.getByRole('button', { name: 'Apply changes' })).toBeDisabled();
    await expect(page.getByRole('heading', { name: 'Orders — revised' })).toBeVisible();
    await page.getByRole('button', { name: 'Invalid proposal' }).click();
    await expect(page.getByRole('alert')).toContainText('invalid_json');
    await expect(page.getByRole('button', { name: 'Apply changes' })).toBeDisabled();
    await panel.evaluate((element) => element.style.setProperty('--primary', 'rgb(12, 34, 56)'));
    expect(await page.getByRole('button', { name: 'Apply changes' }).evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(12, 34, 56)');
    expect(errors).toEqual([]);
    evidence.cases.push({ ...config, inputPreserved: true, requests: 1, applyCount: 1, overflow, errors });
    await page.close();
  }
  writeFileSync(join(output, 'provenance.json'), JSON.stringify(evidence, null, 2));
  console.info(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
  await server.close();
}
