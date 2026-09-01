import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

const aiElementsSource = fileURLToPath(new URL('../../../ai-elements/src/index.ts', import.meta.url));

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@svadmin/ai-elements': aiElementsSource,
    },
  },
  ssr: {
    noExternal: ['@tanstack/svelte-query', 'streamdown-svelte', 'katex'],
  },
  test: {
    environment: 'node',
    globals: true,
    pool: 'threads',
    maxWorkers: 1,
    include: ['src/components/admin-app.context.test-ssr.spec.integration.ts'],
  },
});
