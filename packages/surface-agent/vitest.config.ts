import { resolve } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  resolve: {
    alias: {
      '@svadmin/surface': resolve(import.meta.dirname, '../surface/src/index.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
    globals: true,
    setupFiles: ['./setupTest.ts'],
    include: ['src/**/*.test.{ts,svelte.ts}'],
  },
});
