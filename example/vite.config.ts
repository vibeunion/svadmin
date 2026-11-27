import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

function manualChunks(id: string): string | undefined {
  const normalizedId = id.replaceAll('\\', '/');

  if (normalizedId.includes('/packages/core/')) return 'svadmin-core';
  if (!normalizedId.includes('/node_modules/')) return undefined;

  if (/\/node_modules\/prosemirror-[^/]+\//.test(normalizedId)) return 'editor-prosemirror';
  if (normalizedId.includes('/node_modules/@tiptap/')) return 'editor-tiptap';
  if (normalizedId.includes('/node_modules/katex/')) return 'katex';
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
    tailwindcss({ optimize: false }),
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
    // Chromium 111 起原生支持 color-mix 与 OKLCH，产物不再生成 sRGB 主题回退；
    // Firefox/Safari 目标保持原有基线，宿主可按需自行下调。
    target: ['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4'],
    cssMinify: 'lightningcss',
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
