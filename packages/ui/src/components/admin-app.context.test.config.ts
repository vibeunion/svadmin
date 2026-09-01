import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { fileURLToPath } from 'node:url';

const aiElementsSource = fileURLToPath(new URL('../../../ai-elements/src/index.ts', import.meta.url));

export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  resolve: {
    alias: {
      '@svadmin/ai-elements': aiElementsSource,
    },
  },
  define: {
    'import.meta.env.DEV': 'false',
  },
  ssr: {
    noExternal: ['@tanstack/svelte-query', 'streamdown-svelte', 'katex'],
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
