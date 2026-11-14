import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [svelte()],
  server: { host: '127.0.0.1', port: 4195, strictPort: true },
  build: { outDir: '../../../.pr795-dist', emptyOutDir: true },
});
