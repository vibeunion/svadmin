<script module lang="ts">
  import { getContext } from 'svelte';

  export interface ComponentConfig {
    theme?: 'light' | 'dark' | 'system';
    density?: 'default' | 'compact';
    direction?: 'ltr' | 'rtl';
    locale?: string;
    componentSize?: 'sm' | 'md' | 'lg';
  }

  export const CONFIG_CONTEXT_KEY = Symbol('svadmin-component-config');

  export function useComponentConfig(): Required<ComponentConfig> {
    return getContext<Required<ComponentConfig>>(CONFIG_CONTEXT_KEY) ?? {
      theme: 'system',
      density: 'default',
      direction: 'ltr',
      locale: 'en',
      componentSize: 'md',
    };
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { setContext, untrack } from 'svelte';
  import { cn } from '../utils.js';

  interface Props extends ComponentConfig {
    class?: string;
    children?: Snippet;
  }

  let {
    theme = 'system',
    density = 'default',
    direction = 'ltr',
    locale = 'en',
    componentSize = 'md',
    class: className = '',
    children,
  }: Props = $props();

  setContext(CONFIG_CONTEXT_KEY, untrack(() => ({ theme, density, direction, locale, componentSize })));
</script>

<div
  class={cn('svadmin-config-provider', className)}
  data-theme={theme}
  data-svadmin-density={density}
  data-component-size={componentSize}
  dir={direction}
  lang={locale}
>
  {@render children?.()}
</div>

<style>
  .svadmin-config-provider { display: contents; }
</style>