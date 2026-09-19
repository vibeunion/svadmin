import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
const server = await createServer({ configFile: fileURLToPath(new URL('./vite.config.ts', import.meta.url)), server: { middlewareMode: true } });
try {
  const { default: App } = await server.ssrLoadModule('/App.svelte');
  const { render } = await server.ssrLoadModule('svelte/server');
  const { body } = render(App);
  assert.match(body, /Static preview/);
  assert.match(body, /Product 00000/);
  assert.doesNotMatch(body, /Product 00020/);
  assert.doesNotMatch(body, /<img src=x/);
  console.info('SSR static fallback: passed (20 rows, escaped text)');
} finally {
  await server.close();
}
