import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  resolve: {
    conditions: ['browser'],
  },
  ssr: {
    noExternal: ['@tanstack/svelte-query'],
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./setupTest.ts'],
    include: ['src/**/*.test.svelte.ts'],
  },
});
