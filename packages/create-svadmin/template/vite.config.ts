import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    svelte(),
  ],
  server: {
    port: 5174,
  },
  optimizeDeps: {
    exclude: ['@svadmin/core', '@svadmin/ai-elements', '@svadmin/ui', '@svadmin/supabase'],
  },
  build: {
    cssMinify: 'esbuild',
    chunkSizeWarningLimit: 1500,
  },
});
