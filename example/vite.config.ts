import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

function manualChunks(id: string): string | undefined {
  const normalizedId = id.replaceAll('\\', '/');

  if (normalizedId.includes('/packages/core/')) return 'svadmin-core';
  if (!normalizedId.includes('/node_modules/')) return undefined;

  if (/\/node_modules\/prosemirror-[^/]+\//.test(normalizedId)) return 'editor-prosemirror';
  if (normalizedId.includes('/node_modules/@floating-ui/')) return 'ui-primitives';
  if (normalizedId.includes('/node_modules/@tiptap/')) return 'editor-tiptap';
  if (/\/node_modules\/(?:highlight\.js|lowlight|linkifyjs|rope-sequence)\//.test(normalizedId)) return 'editor-support';
  if (normalizedId.includes('/node_modules/@lucide/svelte/')) return 'icons';
  if (normalizedId.includes('/node_modules/@tanstack/')) return 'tanstack';
  if (/\/node_modules\/(?:bits-ui|svelte-sonner|svelte-toolbelt|runed|tabbable)\//.test(normalizedId)) {
    return 'ui-primitives';
  }
  if (/\/node_modules\/(?:tailwind-merge|tailwind-variants|clsx)\//.test(normalizedId)) return 'styling';
  if (normalizedId.includes('/node_modules/svelte/')) return 'svelte-runtime';
  return 'vendor';
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte(),
  ],
  server: {
    port: 5173,
  },
  resolve: {
    conditions: ['browser'],
  },
  optimizeDeps: {
    exclude: ['@svadmin/core', '@svadmin/surface', '@svadmin/ui', '@svadmin/supabase'],
    include: ['highlight.js'],
  },
  build: {
    cssMinify: 'esbuild',
    manifest: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [{ name: manualChunks }],
        },
      },
    },
  },
});
