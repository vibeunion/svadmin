import { sveltekit } from '@sveltejs/kit/vite';

function ie11CssSelectors() {
  return {
    name: 'svadmin-lite-ie11-css-selectors',
    generateBundle(_options: unknown, bundle: Record<string, { type?: string; source?: string | Uint8Array }>) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== 'asset' || typeof asset.source !== 'string') continue;
        if (!asset.source.includes(':where(')) continue;
        asset.source = asset.source.replace(/:where\((\.svelte-[a-z0-9_-]+)\)/giu, '$1');
      }
    },
  };
}

export default {
  server: {
    host: '127.0.0.1',
    port: 5174,
  },
  plugins: [
    ...(await sveltekit()),
    ie11CssSelectors(),
  ],
};
