import { dirname } from 'node:path';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const repository = fileURLToPath(new URL('../../../', import.meta.url));
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [svelte()],
  resolve: { dedupe: ['svelte'] },
  server: { fs: { allow: [repository, dirname(realpathSync(`${repository}/node_modules`))] } },
});
