import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  define: {
    'import.meta.env.DEV': 'false',
  },
  ssr: {
    noExternal: ['@tanstack/svelte-query'],
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    pool: 'threads',
    maxWorkers: 1,
    testTimeout: 60_000,
    setupFiles: ['./setupTest.ts'],
    include: ['src/components/admin-app.context.test.integration.ts'],
  },
});
