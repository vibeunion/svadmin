import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  ssr: {
    noExternal: [
      '@floating-ui/dom',
      '@floating-ui/core',
      '@svadmin/core',
      'bits-ui',
      'esm-env',
      'runed',
      'svelte-toolbelt',
    ],
  },
  test: {
    environment: 'node',
    globals: true,
    pool: 'threads',
    maxWorkers: 1,
    include: ['src/components/popup-portal.test-ssr.spec.integration.ts'],
  },
});
