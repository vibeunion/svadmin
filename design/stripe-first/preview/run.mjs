import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { buildKit, runtimeSource, verifyRuntimeSources } from '../build.mjs';

export const directory = dirname(fileURLToPath(import.meta.url));
export const root = resolve(directory, '../../..');
export const evidence = resolve(root, 'test-results/stripe-first-browser');
const require = createRequire(resolve(root, 'packages/ui/package.json'));
const { build, preview } = await import(require.resolve('vite'));
const { svelte } = await import(require.resolve('@sveltejs/vite-plugin-svelte'));

export async function buildPreview() {
  // 预览始终消费真实包产物；不通过复制源 CSS 或重新实现控件来伪造渲染。
  const css = readFileSync(resolve(root, runtimeSource.stylesheet), 'utf8');
  verifyRuntimeSources(css, readFileSync(resolve(root, runtimeSource.recipeSource)));
  buildKit(css);
  assert.deepEqual(readFileSync(resolve(root, 'packages/ui/dist/app.css')), readFileSync(resolve(root, 'packages/ui/dist/app.theme.css')));
  await build({
    configFile: false, root: directory, base: './',
    plugins: [svelte({ configFile: false })],
    resolve: { conditions: ['browser'], dedupe: ['svelte'] },
    build: { outDir: resolve(evidence, 'site'), emptyOutDir: true },
  });
}
export async function servePreview() {
  return preview({ configFile: false, root: directory, build: { outDir: resolve(evidence, 'site') }, preview: { host: '127.0.0.1', port: 4179, strictPort: true } });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildPreview();
  if (!process.argv.includes('--build-only')) {
    const server = await servePreview();
    server.printUrls();
  }
}
