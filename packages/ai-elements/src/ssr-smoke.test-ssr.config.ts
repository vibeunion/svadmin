import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte()],
  ssr: {
    noExternal: [
      '@tanstack/svelte-query',
      '@xyflow/svelte',
      '@xyflow/system',
      'katex',
      'streamdown-svelte',
    ],
  },
  test: {
    environment: 'node',
    globals: true,
    pool: 'threads',
    maxWorkers: 1,
    include: ['src/ssr-smoke.test-ssr.spec.integration.ts'],
  },
});
