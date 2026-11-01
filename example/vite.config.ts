import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

function manualChunks(id: string): string | undefined {
  const normalizedId = id.replaceAll('\\', '/');

  if (normalizedId.includes('/packages/core/')) return 'svadmin-core';
  if (!normalizedId.includes('/node_modules/')) return undefined;

  if (/\/node_modules\/prosemirror-[^/]+\//.test(normalizedId)) return 'editor-prosemirror';
  if (normalizedId.includes('/node_modules/@tiptap/')) return 'editor-tiptap';
  if (/\/node_modules\/(?:highlight\.js|lowlight|linkifyjs|rope-sequence|dompurify|isomorphic-dompurify)\//.test(normalizedId)) return 'editor-support';
  if (normalizedId.includes('/node_modules/@tanstack/')) return 'tanstack';
  // 这两个库被 core 启动图引用。单独成块，避免共享模块落进懒加载页面后把整页拉回首屏。
  if (normalizedId.includes('/node_modules/papaparse/')) return 'papaparse';
  if (normalizedId.includes('/node_modules/@internationalized/date/')) return 'internationalized-date';
  if (/\/node_modules\/(?:clsx)\//.test(normalizedId)) return 'styling';
  if (normalizedId.includes('/node_modules/svelte/')) return 'svelte-runtime';
  return undefined;
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
    exclude: ['@svadmin/core', '@svadmin/ai-elements', '@svadmin/surface', '@svadmin/ui', '@svadmin/supabase'],
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
