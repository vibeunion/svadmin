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

  export const DEFAULT_COMPONENT_CONFIG: Required<ComponentConfig> = {
    theme: 'system',
    density: 'default',
    direction: 'ltr',
    locale: 'en',
    componentSize: 'md',
  };

  /** 当前组件是否位于 ConfigProvider 内。只能在组件初始化时调用。 */
  export function hasComponentConfig(): boolean {
    return getContext<Required<ComponentConfig> | undefined>(CONFIG_CONTEXT_KEY) !== undefined;
  }

  export function useComponentConfig(): Required<ComponentConfig> {
    return getContext<Required<ComponentConfig>>(CONFIG_CONTEXT_KEY) ?? DEFAULT_COMPONENT_CONFIG;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { setContext } from 'svelte';
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

  // 保存读取器而不是初始化快照。子组件在渲染或 $derived 中读取字段时，会跟踪对应 prop。
  setContext(CONFIG_CONTEXT_KEY, {
    get theme() { return theme; },
    get density() { return density; },
    get direction() { return direction; },
    get locale() { return locale; },
    get componentSize() { return componentSize; },
  } satisfies Required<ComponentConfig>);
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