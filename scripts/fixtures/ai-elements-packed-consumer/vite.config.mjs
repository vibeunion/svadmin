import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default {
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [svelte()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./client.ts', import.meta.url)),
      formats: ['es'],
    },
  },
};
