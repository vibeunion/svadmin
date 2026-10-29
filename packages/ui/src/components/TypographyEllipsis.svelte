<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount, tick } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';

  const i18n = useTranslation();

  interface Props {
    /** 折叠时保留的行数，对齐 Arco Typography 的 ellipsis.rows。 */
    rows?: number;
    /** 内容超出时显示“展开 / 收起”，对齐 Arco Typography 的 ellipsis.expandable。 */
    expandable?: boolean;
    expanded?: boolean;
    expandText?: string;
    collapseText?: string;
    /** 展开按钮的附加说明，例如“展开全部 12 条”。 */
    expandLabel?: string;
    class?: string;
    onExpand?: (expanded: boolean) => void;
    children: Snippet;
  }

  let {
    rows = 1,
    expandable = false,
    expanded = $bindable(false),
    expandText,
    collapseText,
    expandLabel,
    class: className = '',
    onExpand,
    children,
  }: Props = $props();

  let contentEl = $state<HTMLElement | null>(null);
  let overflowing = $state(false);

  function measure(): void {
    const element = contentEl;
    // 展开状态没有 clamp，无法量出真实溢出高度；保留上一次测量结果。
    if (!element || expanded) return;
    overflowing = element.scrollHeight > element.clientHeight + 1;
  }

  function toggle(): void {
    expanded = !expanded;
    onExpand?.(expanded);
  }

  $effect(() => {
    // rows 变化后需要重新裁剪，再按新的可视高度判断是否溢出。
    void rows;
    void expanded;
    void tick().then(measure);
  });

  onMount(() => {
    if (!contentEl || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(contentEl);
    return () => observer.disconnect();
  });
</script>

<div
  class={cn('svadmin-typography-ellipsis', className)}
  data-expanded={expanded}
  data-overflowing={overflowing}
  style:--svadmin-ellipsis-rows={rows}
>
  <div
    bind:this={contentEl}
    class="svadmin-typography-ellipsis__content"
    class:is-clamped={!expanded}
  >
    {@render children()}
  </div>
  {#if expandable && (overflowing || expanded)}
    <button
      type="button"
      class="svadmin-typography-ellipsis__toggle"
      aria-expanded={expanded}
      aria-label={expandLabel}
      onclick={toggle}
    >
      {expanded
        ? (collapseText ?? i18n.t('common.showLess'))
        : (expandText ?? i18n.t('common.showMore'))}
    </button>
  {/if}
</div>

<style>
  .svadmin-typography-ellipsis { color: var(--foreground); font-size: var(--svadmin-text-label); line-height: 1.5715; }
  .svadmin-typography-ellipsis__content { overflow-wrap: anywhere; }
  .svadmin-typography-ellipsis__content.is-clamped {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--svadmin-ellipsis-rows, 1);
    line-clamp: var(--svadmin-ellipsis-rows, 1);
    overflow: hidden;
  }
  .svadmin-typography-ellipsis__toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--svadmin-space-1);
    margin-block-start: var(--svadmin-space-1);
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--primary);
    font: inherit;
    font-size: var(--svadmin-text-caption);
    cursor: pointer;
  }
  .svadmin-typography-ellipsis__toggle:hover { text-decoration: underline; }
  .svadmin-typography-ellipsis__toggle:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: var(--svadmin-focus-offset);
    border-radius: var(--radius-sm);
  }
</style>