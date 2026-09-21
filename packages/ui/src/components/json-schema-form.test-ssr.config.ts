import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  ssr: { noExternal: ['@tanstack/svelte-query'] },
  test: {
    environment: 'node',
    pool: 'threads',
    maxWorkers: 1,
    include: ['src/components/json-schema-form.test-ssr.spec.integration.ts'],
  },
});
