import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  ssr: {
    noExternal: ['@tanstack/svelte-query'],
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    hookTimeout: 30_000,
    setupFiles: ['./setupTest.ts'],
    include: ['src/**/*.test.{ts,svelte.ts}'],
  },
});
