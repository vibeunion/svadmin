import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export const aiElementsSsrNoExternal = [
  '@tanstack/svelte-query',
  '@xyflow/svelte',
  '@xyflow/system',
  'katex',
  'streamdown-svelte',
];

export default {
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [svelte()],
  ssr: { noExternal: aiElementsSsrNoExternal },
};
