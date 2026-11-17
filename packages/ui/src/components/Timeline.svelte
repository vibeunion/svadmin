<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Loader2 } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface TimelineEntry {
    id: string;
    title: string;
    description?: string;
    time?: string;
    /** `time` 的别名，便于宿主沿用列表式字段名。 */
    label?: string;
    tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
    active?: boolean;
    dot?: Snippet;
    /** 单个节点自定义颜色，写入 `--timeline-dot-color`。 */
    dotColor?: string;
    /** 单个节点连线样式与颜色；未设置时回落到列表级设置。 */
    lineType?: 'solid' | 'dashed' | 'dotted';
    lineColor?: string;
  }

  interface Props {
    items: TimelineEntry[];
    mode?: 'vertical' | 'horizontal' | 'alternate' | 'right';
    direction?: 'horizontal' | 'vertical';
    reverse?: boolean;
    pending?: boolean | string | Snippet;
    pendingDot?: Snippet;
    label?: string;
    /** 列表级连线样式，节点可用 `lineType` 覆盖。 */
    lineType?: 'solid' | 'dashed' | 'dotted';
    class?: string;
    dot?: Snippet<[TimelineEntry]>;
    children?: Snippet<[TimelineEntry]>;
  }

  let {
    items,
    mode = 'vertical',
    direction,
    reverse = false,
    pending,
    pendingDot,
    label = 'Timeline',
    lineType = 'solid',
    class: className = '',
    dot,
    children,
  }: Props = $props();

  const effectiveMode = $derived(
    direction === 'horizontal' ? 'horizontal' : mode
  );
  const displayItems = $derived(reverse ? [...items].reverse() : items);
  const LINE_STYLES = new Set(['solid', 'dashed', 'dotted']);

  function itemStyle(item: TimelineEntry): string | undefined {
    const declarations: string[] = [];
    if (item.dotColor) declarations.push(`--timeline-dot-color: ${item.dotColor}`);
    const style = item.lineType && LINE_STYLES.has(item.lineType) ? item.lineType : lineType;
    declarations.push(`--timeline-item-line-style: ${style}`);
    if (item.lineColor) declarations.push(`--timeline-item-line-color: ${item.lineColor}`);
    return declarations.join('; ');
  }
</script>

<ol class={cn('svadmin-timeline', className)} data-mode={effectiveMode} aria-label={label}>
  {#each displayItems as item, index (item.id)}
    {@const side = mode === 'alternate' ? (index % 2 === 0 ? 'left' : 'right') : undefined}
    <li
      class="svadmin-timeline__item"
      data-tone={item.tone ?? 'neutral'}
      data-active={item.active ? 'true' : undefined}
      data-side={side}
      style={itemStyle(item)}
    >
      {#if item.dot}
        <span class="svadmin-timeline__custom-dot" aria-hidden="true">{@render item.dot()}</span>
      {:else if dot}
        <span class="svadmin-timeline__custom-dot" aria-hidden="true">{@render dot(item)}</span>
      {:else}
        <span class="svadmin-timeline__marker" aria-hidden="true"></span>
      {/if}
      <div class="svadmin-timeline__content">
        {#if children}
          {@render children(item)}
        {:else}
          {#if item.time ?? item.label}<time class="svadmin-timeline__time">{item.time ?? item.label}</time>{/if}
          <p class="svadmin-timeline__title">{item.title}</p>
          {#if item.description}<p class="svadmin-timeline__description">{item.description}</p>{/if}
        {/if}
      </div>
    </li>
  {/each}
  {#if pending}
    <li class="svadmin-timeline__item" data-pending="true">
      <span class="svadmin-timeline__custom-dot" aria-hidden="true">
        {#if pendingDot}
          {@render pendingDot()}
        {:else}
          <Loader2 class="size-3.5 animate-spin text-primary" />
        {/if}
      </span>
      <div class="svadmin-timeline__content">
        {#if typeof pending === 'string'}
          <p class="svadmin-timeline__title">{pending}</p>
        {:else if typeof pending === 'boolean'}
          <p class="svadmin-timeline__title text-muted-foreground">...</p>
        {:else}
          {@render (pending as Snippet)()}
        {/if}
      </div>
    </li>
  {/if}
</ol>

<style>
  .svadmin-timeline {
    display: grid;
    gap: 0;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .svadmin-timeline__item {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--svadmin-space-3);
    min-height: 78px;
    color: var(--foreground);
    font-size: var(--svadmin-text-body);
  }
  .svadmin-timeline:not([data-mode='alternate']) .svadmin-timeline__item:not(:last-child)::before {
    position: absolute;
    inset-block: 1rem calc(-1 * var(--svadmin-space-4));
    inset-inline-start: 0.3125rem;
    width: 1px;
    background: var(--border);
    content: '';
  }
  .svadmin-timeline__marker {
    width: 0.6875rem;
    height: 0.6875rem;
    margin-block-start: 0.3rem;
    border: 2px solid var(--border);
    border-radius: 999px;
    background: var(--card);
  }
  .svadmin-timeline__item[data-tone='info'] .svadmin-timeline__marker { border-color: var(--info, var(--primary)); }
  .svadmin-timeline__item[data-tone='success'] .svadmin-timeline__marker { border-color: var(--success, var(--primary)); }
  .svadmin-timeline__item[data-tone='warning'] .svadmin-timeline__marker { border-color: var(--warning, var(--primary)); }
  .svadmin-timeline__item[data-tone='danger'] .svadmin-timeline__marker { border-color: var(--destructive); }
  .svadmin-timeline__item[data-active='true'] .svadmin-timeline__marker { background: var(--primary); border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent); }
  .svadmin-timeline__custom-dot { display: inline-flex; align-items: center; justify-content: center; margin-block-start: 0.15rem; z-index: 1; color: var(--primary); }
  .svadmin-timeline__content { min-width: 0; }
  .svadmin-timeline__time { color: var(--muted-foreground); font-size: var(--svadmin-text-caption); line-height: 1.667; }
  .svadmin-timeline__title { margin: 0; color: var(--foreground); font-size: var(--svadmin-text-body); font-weight: 500; }
  .svadmin-timeline__description { margin: var(--svadmin-space-1) 0 0; color: var(--muted-foreground); font-size: var(--svadmin-text-body); line-height: 1.5715; }
  .svadmin-timeline[data-mode='horizontal'] {
    grid-auto-flow: column;
    grid-auto-columns: minmax(10rem, 1fr);
  }
  .svadmin-timeline[data-mode='horizontal'] .svadmin-timeline__item:not(:last-child)::before {
    inset: 0.3125rem calc(-1 * var(--svadmin-space-4)) auto auto;
    width: auto;
    height: 1px;
  }

  /* Alternate mode */
  .svadmin-timeline[data-mode='alternate'] {
    position: relative;
    display: block;
    width: 100%;
  }
  .svadmin-timeline[data-mode='alternate']::before {
    position: absolute;
    inset-block: 0.5rem 1rem;
    left: 50%;
    transform: translateX(-50%);
    width: 1px;
    background: var(--border);
    content: '';
  }
  .svadmin-timeline[data-mode='alternate'] .svadmin-timeline__item {
    display: flex;
    box-sizing: border-box;
    width: 50%;
    min-height: 70px;
  }
  .svadmin-timeline[data-mode='alternate'] .svadmin-timeline__item[data-side='left'] {
    margin-right: auto;
    flex-direction: row-reverse;
    text-align: right;
    padding-right: var(--svadmin-space-4);
  }
  .svadmin-timeline[data-mode='alternate'] .svadmin-timeline__item[data-side='left'] .svadmin-timeline__marker,
  .svadmin-timeline[data-mode='alternate'] .svadmin-timeline__item[data-side='left'] .svadmin-timeline__custom-dot {
    transform: translateX(calc(var(--svadmin-space-4) + 0.34375rem));
  }
  .svadmin-timeline[data-mode='alternate'] .svadmin-timeline__item[data-side='right'] {
    margin-left: 50%;
    text-align: left;
    padding-left: var(--svadmin-space-4);
  }
  .svadmin-timeline[data-mode='alternate'] .svadmin-timeline__item[data-side='right'] .svadmin-timeline__marker,
  .svadmin-timeline[data-mode='alternate'] .svadmin-timeline__item[data-side='right'] .svadmin-timeline__custom-dot {
    transform: translateX(calc(-1 * (var(--svadmin-space-4) + 0.34375rem)));
  }
</style>
