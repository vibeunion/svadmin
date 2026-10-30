<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronDown } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface CollapseItem {
    id: string;
    title: string;
    description?: string;
    content: Snippet;
    disabled?: boolean;
  }

  interface Props {
    items: CollapseItem[];
    openIds?: string[];
    /** 是否允许多个面板同时展开；accordion 仍优先。 */
    multiple?: boolean;
    accordion?: boolean;
    /** 对齐折叠面板：默认带外框，可关闭以适应卡片内嵌套。 */
    bordered?: boolean;
    /** 展开图标位置，对齐参考实现的 expand-icon-position。 */
    expandIconPosition?: 'left' | 'right';
    /** 关闭后是否销毁内容；默认保留以便做高度过渡。 */
    destroyOnHide?: boolean;
    /** 首次展开前不渲染内容，对齐参考实现的 lazyload。 */
    lazyload?: boolean;
    /** 是否显示展开图标。 */
    showExpandIcon?: boolean;
    /** 自定义展开图标，替代默认 ChevronDown。 */
    expandIcon?: Snippet;
    class?: string;
    onchange?: (openIds: string[]) => void;
  }

  let {
    items,
    openIds = $bindable([]),
    multiple = true,
    accordion = false,
    bordered = true,
    expandIconPosition = 'right',
    destroyOnHide = false,
    lazyload = false,
    showExpandIcon = true,
    expandIcon,
    class: className = '',
    onchange,
  }: Props = $props();

  // 记录已经展开过的面板，供 lazyload 判断“首次展开后才挂载”。
  let openedIds = $state<string[]>([]);
  $effect(() => {
    const unseen = openIds.filter((id) => !openedIds.includes(id));
    if (unseen.length) openedIds = [...openedIds, ...unseen];
  });

  function shouldMount(item: CollapseItem, open: boolean): boolean {
    if (open) return true;
    if (destroyOnHide) return false;
    if (lazyload && !openedIds.includes(item.id)) return false;
    return true;
  }

  function toggle(id: string, disabled = false): void {
    if (disabled) return;
    const isOpen = openIds.includes(id);
    let next: string[];
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
>
  {#each items as item (item.id)}
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
    padding: var(--svadmin-space-3) var(--svadmin-space-4);
    border: 0;
    background: var(--muted);
    color: var(--foreground);
    text-align: start;
    cursor: pointer;
  }
  .svadmin-collapse__trigger:hover,
  .svadmin-collapse__trigger:focus-visible { background: var(--accent); outline: none; }
  .svadmin-collapse__trigger[aria-expanded='true'] { background: var(--card); }
  .svadmin-collapse__label { display: grid; flex: 1; gap: 0.1rem; min-width: 0; }
  .svadmin-collapse__label strong { font-size: var(--svadmin-text-label); font-weight: 600; }
  .svadmin-collapse__label small { color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  .svadmin-collapse__icon { display: inline-flex; flex: 0 0 auto; color: var(--muted-foreground); transition: transform var(--svadmin-motion-fast) var(--svadmin-motion-easing); }
  .svadmin-collapse__trigger.is-open .svadmin-collapse__icon { transform: rotate(180deg); }
  .svadmin-collapse__trigger:disabled { cursor: not-allowed; opacity: 0.5; }
  .svadmin-collapse__content {
    display: grid;
    grid-template-rows: 0fr;
    border-block-start: 1px solid transparent;
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-label);
    transition:
      grid-template-rows var(--svadmin-motion-standard) var(--svadmin-motion-easing),
      border-color var(--svadmin-motion-standard) var(--svadmin-motion-easing);
  }
  .svadmin-collapse__content[data-state='open'] { grid-template-rows: 1fr; border-block-start-color: var(--border); }
  .svadmin-collapse__content-inner { min-height: 0; overflow: hidden; padding-inline: var(--svadmin-space-4); }
  .svadmin-collapse__content[data-state='open'] .svadmin-collapse__content-inner {
    padding-block: var(--svadmin-space-3) var(--svadmin-space-4);
  }
  @media (prefers-reduced-motion: reduce) {
    .svadmin-collapse__icon,
    .svadmin-collapse__content { transition: none; }
  }
</style>