/** @type { import('@storybook/svelte-vite').StorybookConfig } */
import { svelte } from '@sveltejs/vite-plugin-svelte';

const config = {
  stories: [
    '../packages/ui/stories/**/*.stories.@(svelte|ts)',
  ],
  addons: [
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/svelte-vite',
    options: {
      docgen: false,
    },
  },
  async viteFinal(config) {
    return {
      ...config,
      plugins: [...(config.plugins ?? []), svelte()],
    };
  },
};

export default config;
