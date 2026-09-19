import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [svelte()],
  resolve: { dedupe: ['svelte'] },
  ssr: { noExternal: ['@tanstack/svelte-query'] },
  build: { rollupOptions: { input: {
    basic: fileURLToPath(new URL('index.html', import.meta.url)),
    advanced: fileURLToPath(new URL('advanced.html', import.meta.url)),
  } } },
  server: { host: '127.0.0.1', port: 4175, strictPort: true, fs: { allow: [fileURLToPath(new URL('../../..', import.meta.url))] } },
});
