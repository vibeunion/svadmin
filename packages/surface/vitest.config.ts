import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  ssr: {
    // Compile the real packaged form and its Svelte dependencies in component tests.
    noExternal: ['@tanstack/svelte-query', '@svadmin/ui', 'bits-ui'],
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
