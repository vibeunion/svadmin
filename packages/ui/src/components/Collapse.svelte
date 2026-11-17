<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronDown } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface CollapseItem {
    id?: string | number;
    key?: string | number;
    name?: string | number;
    title?: string;
    header?: string;
    description?: string;
    extra?: Snippet;
    content: Snippet;
    disabled?: boolean;
    [key: string]: unknown;
  }

  interface Props {
    items: CollapseItem[];
    openIds?: (string | number)[];
    activeKey?: string | number | (string | number)[];
    defaultActiveKey?: string | number | (string | number)[];
    /** 是否允许多个面板同时展开；accordion 仍优先。 */
    multiple?: boolean;
    accordion?: boolean;
    /** 对齐折叠面板：默认带外框，可关闭以适应卡片内嵌套。 */
    bordered?: boolean;
    /** 展开图标位置，对齐参考实现的 expand-icon-position。 */
    expandIconPosition?: 'left' | 'right';
    /** 尺寸规范 */
    size?: 'mini' | 'small' | 'default' | 'large';
    /** 关闭后是否销毁内容；默认保留以便做高度过渡。 */
    destroyOnHide?: boolean;
    /** 首次展开前不渲染内容，对齐参考实现的 lazyload。 */
    lazyload?: boolean;
    /** 是否显示展开图标。 */
    showExpandIcon?: boolean;
    /** 自定义展开图标，替代默认 ChevronDown。 */
    expandIcon?: Snippet;
    class?: string;
    onchange?: (openIds: (string | number)[]) => void;
  }

  const toArray = (v: unknown): (string | number)[] =>
    Array.isArray(v) ? v : (v !== undefined && v !== null ? [v as string | number] : []);

  let {
    items,
    openIds = $bindable([]),
    activeKey,
    defaultActiveKey,
    multiple = true,
    accordion = false,
    bordered = true,
    expandIconPosition = 'right',
    size = 'default',
    destroyOnHide = false,
    lazyload = false,
    showExpandIcon = true,
    expandIcon,
    class: className = '',
    onchange,
  }: Props = $props();

  let initialized = false;
  $effect.pre(() => {
    if (!initialized) {
      initialized = true;
      if (activeKey !== undefined) {
        openIds = toArray(activeKey);
      } else if (defaultActiveKey !== undefined && openIds.length === 0) {
        openIds = toArray(defaultActiveKey);
      }
    } else if (activeKey !== undefined) {
      openIds = toArray(activeKey);
    }
  });

  const normalizedItems = $derived(
    items.map((item, index) => {
      const id = String(item.id ?? item.key ?? item.name ?? index);
      const title = item.title ?? item.header ?? '';
      return {
        ...item,
        id,
        title,
      };
    })
  );

  // 记录已经展开过的面板，供 lazyload 判断“首次展开后才挂载”。
  let openedIds = $state<(string | number)[]>([]);
  $effect(() => {
    const unseen = openIds.filter((id) => !openedIds.includes(id));
    if (unseen.length) openedIds = [...openedIds, ...unseen];
  });

  function shouldMount(item: { id: string | number }, open: boolean): boolean {
    if (open) return true;
    if (destroyOnHide) return false;
    if (lazyload && !openedIds.includes(item.id)) return false;
    return true;
  }

  function toggle(id: string | number, disabled = false): void {
    if (disabled) return;
    const isOpen = openIds.includes(id);
    let next: (string | number)[];
    if (isOpen) next = openIds.filter((value) => value !== id);
    else if (!multiple || accordion) next = [id];
    else next = [...openIds, id];
    openIds = next;
    onchange?.(next);
  }
</script>

<div
  class={cn('svadmin-collapse', !bordered && 'svadmin-collapse--borderless', className)}
  data-bordered={bordered}
  data-expand-icon-position={expandIconPosition}
  data-size={size}
>
  {#each normalizedItems as item (item.id)}
    {@const open = openIds.includes(item.id)}
    <section class="svadmin-collapse__item" data-state={open ? 'open' : 'closed'}>
      <button
        type="button"
        class={open ? 'svadmin-collapse__trigger is-open' : 'svadmin-collapse__trigger'}
        aria-expanded={open}
        aria-controls={`svadmin-collapse-${item.id}`}
        disabled={item.disabled}
        onclick={() => toggle(item.id, item.disabled)}
      >
        {#if showExpandIcon && expandIconPosition === 'left'}
          <span class="svadmin-collapse__icon" aria-hidden="true">
            {#if expandIcon}{@render expandIcon()}{:else}<ChevronDown class="svadmin-collapse__chevron" size={16} />{/if}
          </span>
        {/if}
        <span class="svadmin-collapse__label">
          <strong>{item.title}</strong>
          {#if item.description}<small>{item.description}</small>{/if}
        </span>
        {#if item.extra}
          <span
            class="svadmin-collapse__extra"
            role="presentation"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
          >
            {@render item.extra()}
          </span>
        {/if}
        {#if showExpandIcon && expandIconPosition === 'right'}
          <span class="svadmin-collapse__icon" aria-hidden="true">
            {#if expandIcon}{@render expandIcon()}{:else}<ChevronDown class="svadmin-collapse__chevron" size={16} />{/if}
          </span>
        {/if}
      </button>
      {#if shouldMount(item, open)}
        <div
          id={`svadmin-collapse-${item.id}`}
          class="svadmin-collapse__content"
          data-state={open ? 'open' : 'closed'}
          inert={!open}
          aria-hidden={!open}
        >
          <div class="svadmin-collapse__content-inner">
            {@render item.content()}
          </div>
        </div>
      {/if}
    </section>
  {/each}
</div>

<style>
  .svadmin-collapse {
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--card);
  }
  .svadmin-collapse--borderless { border: 0; border-radius: 0; background: transparent; }
  .svadmin-collapse--borderless .svadmin-collapse__trigger,
  .svadmin-collapse--borderless .svadmin-collapse__trigger[aria-expanded='true'] { background: transparent; }
  .svadmin-collapse--borderless > .svadmin-collapse__item + .svadmin-collapse__item { border-block-start: 1px solid var(--border); }
  .svadmin-collapse__item + .svadmin-collapse__item { border-block-start: 1px solid var(--border); }
  .svadmin-collapse__trigger {
    display: flex;
    align-items: center;
    gap: var(--svadmin-space-2);
    width: 100%;
    padding: 8px 13px;
    font-size: var(--svadmin-text-body);
    line-height: var(--svadmin-control-h-mini);
    border: 0;
    background: var(--card);
    color: var(--foreground);
    text-align: start;
    cursor: pointer;
  }
  .svadmin-collapse__trigger:hover,
  .svadmin-collapse__trigger:focus-visible { background: var(--svadmin-fill-2, var(--muted)); outline: none; }
  .svadmin-collapse__trigger[aria-expanded='true'] { background: var(--card); }
  .svadmin-collapse__label { display: grid; flex: 1; gap: 0.1rem; min-width: 0; }
  .svadmin-collapse__label strong { font-size: var(--svadmin-text-body); font-weight: 400; }
  .svadmin-collapse__trigger[aria-expanded='true'] .svadmin-collapse__label strong { font-weight: 500; }
  .svadmin-collapse__label small { color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  .svadmin-collapse__extra {
    display: inline-flex;
    align-items: center;
    margin-inline-end: var(--svadmin-space-2, 0.5rem);
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-caption, 0.75rem);
  }
  .svadmin-collapse__icon { display: inline-flex; flex: 0 0 auto; color: var(--muted-foreground); transition: transform var(--svadmin-motion-fast) var(--svadmin-motion-easing); }
  .svadmin-collapse__trigger.is-open .svadmin-collapse__icon { transform: rotate(180deg); }
  .svadmin-collapse__trigger:disabled { cursor: not-allowed; opacity: 1; color: var(--svadmin-text-4); }
  .svadmin-collapse__content {
    display: grid;
    grid-template-rows: 0fr;
    border-block-start: 1px solid transparent;
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-body);
    line-height: var(--svadmin-leading-body);
    transition:
      grid-template-rows var(--svadmin-motion-standard) var(--svadmin-motion-easing),
      border-color var(--svadmin-motion-standard) var(--svadmin-motion-easing);
  }
  .svadmin-collapse__content[data-state='open'] { grid-template-rows: 1fr; border-block-start-color: var(--border); }
  .svadmin-collapse__content-inner { min-height: 0; overflow: hidden; padding-inline: var(--svadmin-space-4); }
  .svadmin-collapse__content[data-state='open'] .svadmin-collapse__content-inner {
    padding-block: var(--svadmin-space-3) var(--svadmin-space-4);
  }

  /* Size variations */
  .svadmin-collapse[data-size='mini'] .svadmin-collapse__trigger {
    padding: 4px 8px;
    font-size: var(--svadmin-text-caption, 0.75rem);
  }
  .svadmin-collapse[data-size='mini'] .svadmin-collapse__content-inner {
    padding-inline: var(--svadmin-space-2, 0.5rem);
  }
  .svadmin-collapse[data-size='small'] .svadmin-collapse__trigger {
    padding: 6px 10px;
    font-size: var(--svadmin-text-caption, 0.75rem);
  }
  .svadmin-collapse[data-size='small'] .svadmin-collapse__content-inner {
    padding-inline: var(--svadmin-space-3, 0.75rem);
  }
  .svadmin-collapse[data-size='large'] .svadmin-collapse__trigger {
    padding: 12px 16px;
    font-size: var(--svadmin-text-section, 1rem);
  }
  .svadmin-collapse[data-size='large'] .svadmin-collapse__content-inner {
    padding-inline: var(--svadmin-space-5, 1.25rem);
  }

  @media (prefers-reduced-motion: reduce) {
    .svadmin-collapse__icon,
    .svadmin-collapse__content { transition: none; }
  }
</style>
