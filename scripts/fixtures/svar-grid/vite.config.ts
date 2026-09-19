import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const uiComponents = fileURLToPath(new URL('../../../packages/ui/src/components/', import.meta.url));
export default defineConfig({
  root, plugins: [svelte()],
  resolve: { dedupe: ['svelte'], alias: [{ find: /^@svadmin\/ui\/components\/(.*)$/, replacement: `${uiComponents}$1` }] },
  ssr: { noExternal: ['@tanstack/svelte-query'] },
  build: { rollupOptions: { input: {
    basic: fileURLToPath(new URL('index.html', import.meta.url)), advanced: fileURLToPath(new URL('advanced.html', import.meta.url)), surface: fileURLToPath(new URL('surface.html', import.meta.url)),
    autoTable: fileURLToPath(new URL('auto-table.html', import.meta.url)),
  } } },
  server: { host: '127.0.0.1', port: 4175, strictPort: true, fs: { allow: [fileURLToPath(new URL('../../..', import.meta.url))] } },
});
