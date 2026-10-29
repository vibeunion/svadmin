<script lang="ts">
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  type ScrollMode = 'page' | 'contained';
  type ScrollbarPlacement = 'top' | 'bottom';

  interface Props {
    children: Snippet;
    class?: string | undefined;
    /** `contained` limits vertical height and keeps the table header visible. */
    scrollMode?: ScrollMode;
    /** Place the mirrored horizontal scrollbar above or below the viewport. */
    scrollbarPlacement?: ScrollbarPlacement;
  }

  let {
    children,
    class: className = '',
    scrollMode = 'page',
    scrollbarPlacement = 'bottom',
  }: Props = $props();
  const id = $props.id();
  const scrollRegionId = `svadmin-scrollable-table-${id}`;
  let viewport = $state<HTMLDivElement | null>(null);
  let mirror = $state<HTMLDivElement | null>(null);
  let contentWidth = $state(0);
  let viewportWidth = $state(0);
  let mirrorScrollLeft = $state(0);
  let hasOverflow = $state(false);
  let synchronizing = false;

  function refreshOverflow(): void {
    const horizontalViewport = resolveHorizontalViewport();
    if (!horizontalViewport) return;
    contentWidth = horizontalViewport.scrollWidth;
    viewportWidth = horizontalViewport.clientWidth;
    mirrorScrollLeft = horizontalViewport.scrollLeft;
    hasOverflow = contentWidth > horizontalViewport.clientWidth;
  }

  function syncMirror(): void {
    if (synchronizing || !mirror) return;
    const horizontalViewport = resolveHorizontalViewport();
    if (!horizontalViewport) return;
    synchronizing = true;
    mirror.scrollLeft = horizontalViewport.scrollLeft;
    mirrorScrollLeft = horizontalViewport.scrollLeft;
    synchronizing = false;
  }

  function syncViewport(): void {
    const horizontalViewport = resolveHorizontalViewport();
    if (synchronizing || !horizontalViewport || !mirror) return;
    synchronizing = true;
    horizontalViewport.scrollLeft = mirror.scrollLeft;
    mirrorScrollLeft = horizontalViewport.scrollLeft;
    synchronizing = false;
  }

  function moveMirrorScroll(event: KeyboardEvent): void {
    if (!mirror || !hasOverflow) return;
    const maxScrollLeft = Math.max(contentWidth - viewportWidth, 0);
    let nextScrollLeft = mirror.scrollLeft;
    if (event.key === 'ArrowRight') nextScrollLeft += 80;
    else if (event.key === 'ArrowLeft') nextScrollLeft -= 80;
    else if (event.key === 'PageDown') nextScrollLeft += viewportWidth;
    else if (event.key === 'PageUp') nextScrollLeft -= viewportWidth;
    else if (event.key === 'Home') nextScrollLeft = 0;
    else if (event.key === 'End') nextScrollLeft = maxScrollLeft;
    else return;
    event.preventDefault();
    mirror.scrollLeft = Math.max(0, Math.min(nextScrollLeft, maxScrollLeft));
    syncViewport();
  }

  function resolveHorizontalViewport(): HTMLElement | null {
    if (!viewport) return null;
    return viewport;
  }

  // 滚动条重新挂载或尺寸改变后，保持其位置与真实视口一致。
  $effect(() => {
    if (mirror) mirror.scrollLeft = mirrorScrollLeft;
  });

  onMount(() => {
    if (!viewport) return;
    const horizontalViewport = resolveHorizontalViewport();
    if (!horizontalViewport) return;
    const resizeObserver = new ResizeObserver(refreshOverflow);
    let observedTable: HTMLElement | null = null;
    const observeTable = (): void => {
      const table = viewport?.querySelector<HTMLElement>(
        ':scope > table, :scope > [data-slot="table-container"] > table',
      ) ?? null;
      if (table === observedTable) {
        refreshOverflow();
        return;
      }
      if (observedTable) resizeObserver.unobserve(observedTable);
      observedTable = table;
      if (observedTable) resizeObserver.observe(observedTable);
      refreshOverflow();
    };
    const mutationObserver = new MutationObserver(observeTable);
    viewport.addEventListener('scroll', syncMirror, true);
    resizeObserver.observe(horizontalViewport);
    mutationObserver.observe(viewport, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    observeTable();
    return () => {
      viewport?.removeEventListener('scroll', syncMirror, true);
      if (observedTable) resizeObserver.unobserve(observedTable);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  });
</script>

{#snippet mirroredScrollbar(placement: ScrollbarPlacement)}
  <div
    class={cn('svadmin-scrollable-table__scrollbar', placement === 'top' && 'svadmin-scrollable-table__scrollbar--top')}
    aria-label={placement === 'top' ? '列表上方横向滚动' : '列表横向滚动'}
    role="scrollbar"
    aria-controls={scrollRegionId}
    aria-orientation="horizontal"
    aria-valuemin="0"
    aria-valuemax={Math.max(contentWidth - viewportWidth, 0)}
    aria-valuenow={mirrorScrollLeft}
    tabindex="0"
    bind:this={mirror}
    onscroll={syncViewport}
    onkeydown={moveMirrorScroll}
  >
    <div style={`width: ${contentWidth}px`}></div>
  </div>
{/snippet}

{#if hasOverflow && scrollbarPlacement === 'top'}
  {@render mirroredScrollbar('top')}
{/if}
<div
  class={cn('svadmin-scrollable-table', scrollMode === 'contained' && 'svadmin-scrollable-table--contained', className)}
  bind:this={viewport}
  id={scrollRegionId}
  data-svadmin-scrollable-table
>
  {@render children()}
</div>
{#if hasOverflow && scrollbarPlacement === 'bottom'}
  {@render mirroredScrollbar('bottom')}
{/if}

<style>
  .svadmin-scrollable-table {
    width: 100%;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }
  /* 外层统一负责两轴滚动，避免内层滚动容器阻断表头吸顶。 */
  .svadmin-scrollable-table > :global([data-slot='table-container']) {
    overflow: visible;
  }
  .svadmin-scrollable-table::-webkit-scrollbar {
    display: none;
  }
  .svadmin-scrollable-table--contained {
    max-height: min(65vh, 42rem);
    overflow: auto;
    scrollbar-color: color-mix(in srgb, var(--muted-foreground) 55%, transparent) transparent;
    scrollbar-width: thin;
  }
  .svadmin-scrollable-table--contained::-webkit-scrollbar {
    display: block;
    width: 0.65rem;
    height: 0;
  }
  .svadmin-scrollable-table--contained :global(thead th) {
    position: sticky;
    top: 0;
    z-index: 4;
    background: var(--card, var(--background));
    box-shadow: inset 0 -1px var(--border);
  }
  .svadmin-scrollable-table__scrollbar {
    position: sticky;
    bottom: 0;
    z-index: 12;
    overflow-x: auto;
    overflow-y: hidden;
    border-block: 1px solid var(--border);
    background: var(--card, var(--background));
    box-shadow: 0 0.45rem 0.7rem -0.7rem color-mix(in srgb, var(--foreground) 45%, transparent);
  }
  .svadmin-scrollable-table__scrollbar--top {
    top: 0.5rem;
    bottom: auto;
  }
  .svadmin-scrollable-table__scrollbar > div { height: 0.8rem; }
</style>
