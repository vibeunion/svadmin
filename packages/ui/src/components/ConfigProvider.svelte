<script module lang="ts">
  import { getContext } from 'svelte';

  export type ComponentPropDefaults = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

  export interface EmptyStateDefaults {
    readonly title?: string;
    readonly description?: string;
    readonly image?: string;
    readonly imageAlt?: string;
  }

  export interface PaginationDefaults {
    readonly pageSize?: number;
    readonly pageSizeOptions?: readonly number[];
    readonly showSummary?: boolean;
    readonly simple?: boolean;
    readonly showJumper?: boolean;
  }

  /**
   * 弹出层挂载点。`node` 是触发器或锚点，不是已经挂到 body 上的浮层。
   * 返回元素、选择器，或空值以回退到 document.body。
   */
  export type GetPopupContainer = (node?: HTMLElement) => HTMLElement | string | null | undefined;

  /** Node SSR 没有 HTMLElement。typeof 守卫避免 `instanceof` 触发 ReferenceError。 */
  function isHtmlElement(value: unknown): value is HTMLElement {
    return typeof HTMLElement !== 'undefined' && value instanceof HTMLElement;
  }

  export interface ComponentConfig {
    theme?: 'light' | 'dark' | 'system';
    density?: 'default' | 'compact';
    direction?: 'ltr' | 'rtl';
    locale?: string;
    componentSize?: 'sm' | 'md' | 'lg';
    /**
     * 按组件名设置的默认参数，例如 `{ Button: { variant: 'outline' } }`。显式 props 优先。
     * 目前只有 Button、Empty（EmptyState）和 Pagination（ListPagination）会读取。
     */
    componentDefaults?: ComponentPropDefaults;
    /** 空状态默认文案和插图。 */
    empty?: EmptyStateDefaults;
    /** 分页默认参数。 */
    pagination?: PaginationDefaults;
    /** 弹出层与浮层的挂载容器，语义对齐 getPopupContainer。 */
    getPopupContainer?: GetPopupContainer;
  }

  export const CONFIG_CONTEXT_KEY = Symbol('svadmin-component-config');

  export const DEFAULT_PAGE_SIZE_OPTIONS = Object.freeze([10, 20, 50]);

  export const DEFAULT_COMPONENT_DEFAULTS: ComponentPropDefaults = Object.freeze({});

  export const DEFAULT_EMPTY_STATE: EmptyStateDefaults = Object.freeze({});

  export const DEFAULT_PAGINATION: PaginationDefaults = Object.freeze({});

  export function defaultGetPopupContainer(node?: HTMLElement): HTMLElement | undefined {
    const doc = node?.ownerDocument ?? (typeof document === 'undefined' ? undefined : document);
    return doc?.body;
  }

  export function resolvePopupContainer(getPopupContainer: GetPopupContainer | undefined, node?: HTMLElement): HTMLElement | undefined {
    const fallback = defaultGetPopupContainer(node);
    if (!getPopupContainer) return fallback;
    const resolved = getPopupContainer(node);
    if (isHtmlElement(resolved)) return resolved;
    if (typeof resolved === 'string' && resolved.length > 0) {
      const doc = node?.ownerDocument ?? (typeof document === 'undefined' ? undefined : document);
      const found = doc?.querySelector(resolved);
      if (isHtmlElement(found)) return found;
    }
    return fallback;
  }

  export const DEFAULT_COMPONENT_CONFIG: Required<ComponentConfig> = {
    theme: 'system',
    density: 'default',
    direction: 'ltr',
    locale: 'en',
    componentSize: 'md',
    componentDefaults: DEFAULT_COMPONENT_DEFAULTS,
    empty: DEFAULT_EMPTY_STATE,
    pagination: DEFAULT_PAGINATION,
    getPopupContainer: defaultGetPopupContainer,
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
    componentDefaults = DEFAULT_COMPONENT_DEFAULTS,
    empty = DEFAULT_EMPTY_STATE,
    pagination = DEFAULT_PAGINATION,
    getPopupContainer = defaultGetPopupContainer,
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
    get componentDefaults() { return componentDefaults; },
    get empty() { return empty; },
    get pagination() { return pagination; },
    get getPopupContainer() { return getPopupContainer; },
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
