import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightImageZoom from 'starlight-image-zoom';
import starlightLinksValidator from 'starlight-links-validator';
import svelte from '@astrojs/svelte';

export default defineConfig({
  site: 'https://svadmin.nestjs.cn',
  markdown: {
    processor: unified({
      gfm: true,
      smartypants: true,
    }),
  },
  integrations: [
    svelte(),
    starlight({
      plugins: [
        starlightLlmsTxt(),
        starlightImageZoom(),
        starlightLinksValidator(),
      ],
      customCss: ['./src/styles/custom.css'],
      title: 'svadmin',
      description: 'Headless admin framework for Svelte 5',
      head: [
        {
          tag: 'style',
          attrs: { is: 'inline' },
          content: `
            html:not([data-theme-ready]) { visibility: hidden; }
            @media (scripting: none) { html:not([data-theme-ready]) { visibility: visible; } }
          `,
        },
        {
          tag: 'script',
          attrs: { is: 'inline' },
          content: `
            (function() {
              var root = document.documentElement;
              var theme = typeof localStorage !== 'undefined' && localStorage.getItem('starlight-theme');
              var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              var resolvedTheme = theme === 'dark' || (!theme && prefersDark) ? 'dark' : 'light';
              root.dataset.theme = resolvedTheme;
              // 主题确定后再显示页面，避免浅色/深色之间的闪屏。
              root.dataset.themeReady = 'true';
            })();
          `,
        },
      ],
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        'zh-cn': { label: '简体中文', lang: 'zh-CN' },
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/vibeunion/svadmin' },
      ],
      editLink: {
        baseUrl: 'https://github.com/vibeunion/svadmin/edit/main/docs/',
      },
      sidebar: [
        {
          label: 'Getting Started',
          translations: { 'zh-CN': '快速上手' },
          items: [
            { slug: 'guides/introduction' },
            { slug: 'guides/quick-start' },
            { slug: 'guides/resource-type-registry' },
            { slug: 'guides/declarative-surface' },
            { slug: 'guides/flow' },
            { slug: 'guides/core-hooks-contract' },
            { slug: 'guides/design-principles' },
            { slug: 'guides/reference-targets' },
            { slug: 'guides/interface-generation' },
            { slug: 'guides/comparison' },
            { slug: 'guides/playground' },
            { slug: 'guides/ecosystem-coverage' },
            { slug: 'guides/swizzle' },
            { slug: 'guides/lite' },
          ],
        },
        {
          label: 'Providers',
          translations: { 'zh-CN': '提供器' },
          items: [
            { slug: 'providers/data-provider' },
            { slug: 'providers/refine-adapter' },
            { slug: 'providers/auth' },
            { slug: 'providers/auth0' },
            { slug: 'providers/router' },
            { slug: 'providers/live' },
            { slug: 'providers/elysia' },
            { slug: 'providers/drizzle' },
            { slug: 'providers/sso' },
            { slug: 'providers/auth-utils' },
            { slug: 'providers/storage' },
            { slug: 'providers/clerk' },
            { slug: 'providers/elasticsearch' },
            { slug: 'providers/pusher' },
            { slug: 'providers/socketio' },
            { slug: 'providers/sveltekit' },
          ],
        },
        {
          label: 'Hooks',
          items: [
            { slug: 'hooks/data' },
            { slug: 'hooks/auth' },
            { slug: 'hooks/form-table' },
            { slug: 'hooks/browser' },
          ],
        },
        {
          label: 'Components',
          translations: { 'zh-CN': '组件' },
          items: [
            { slug: 'components/crud-pages' },
            { slug: 'components/app-shell' },
            { slug: 'components/content-components' },
            { slug: 'components/buttons' },
            { slug: 'components/autosave' },
            { slug: 'components/feedback' },
            { slug: 'components/enterprise' },
            { slug: 'components/ai-components' },
            { slug: 'components/ecosystem-adapters' },
            { slug: 'components/rich-content' },
          ],
        },
        {
          label: 'Reference',
          translations: { 'zh-CN': '参考' },
          items: [{ slug: 'reference/configuration' }],
        },
      ],
    }),
  ],
});
