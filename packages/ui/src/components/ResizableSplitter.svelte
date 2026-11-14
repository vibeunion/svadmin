<script lang="ts">
  import { onDestroy, untrack, type Snippet } from 'svelte';

  export interface ResizableSplitterProps {
    direction?: 'horizontal' | 'vertical';
    initialSizes?: [number, number];
    minSizes?: [number, number];
    maxSizes?: [number, number];
    storageKey?: string;
    collapsible?: boolean;
    gutterSize?: number;
    class?: string;
    firstPane?: Snippet;
    secondPane?: Snippet;
    onResize?: (sizes: [number, number]) => void;
    onCollapse?: (collapsedPane: 'first' | 'second' | null) => void;
  }

  const {
    direction = 'horizontal',
    initialSizes = [50, 50],
    minSizes = [15, 15],
    maxSizes = [85, 85],
    storageKey,
    collapsible = true,
    gutterSize = 8,
    class: className = '',
    firstPane,
    secondPane,
    onResize,
    onCollapse,
  }: ResizableSplitterProps = $props();

  let containerEl = $state<HTMLDivElement | null>(null);
  let sizes = $state<[number, number]>(untrack(() => normalize(initialSizes)));
  let isDragging = $state(false);
  let collapsedPane = $state<'first' | 'second' | null>(null);
  let stopDragging = () => {};
  let layoutConfiguration = '';

  function bounds(): [number, number] {
    const lower = Math.max(0, minSizes[0], 100 - maxSizes[1]);
    const upper = Math.min(100, maxSizes[0], 100 - minSizes[1]);
    return [lower, Math.max(lower, upper)];
  }
  function normalize(input: unknown): [number, number] {
    const [lower, upper] = bounds();
    function validPair(value: unknown): value is [number, number] {
      return Array.isArray(value) && value.length === 2 &&
        typeof value[0] === 'number' && Number.isFinite(value[0]) && value[0] >= 0 &&
        typeof value[1] === 'number' && Number.isFinite(value[1]) && value[1] >= 0 &&
        Number.isFinite(value[0] + value[1]) && value[0] + value[1] > 0;
    }
    const pair = validPair(input) ? input : validPair(initialSizes) ? initialSizes : [50, 50];
    let first = (pair[0] ?? 50) / ((pair[0] ?? 50) + (pair[1] ?? 50)) * 100;
    first = Number(Math.max(lower, Math.min(upper, first)).toFixed(2));
    return [first, Number((100 - first).toFixed(2))];
  }

  $effect(() => {
    const settings = { direction, initialSizes, minSizes, maxSizes, storageKey };
    const signature = JSON.stringify(settings);
    if (signature === layoutConfiguration) return;
    layoutConfiguration = signature;
    untrack(() => {
      // 配置切换时终止旧拖拽，避免把旧布局的移动写入新的存储键。
      stopDragging();
      let next: unknown = settings.initialSizes;
      if (settings.storageKey && typeof localStorage !== 'undefined') {
        try {
          const saved = localStorage.getItem(`svadmin_splitter_${settings.storageKey}`);
          if (saved) next = JSON.parse(saved);
        } catch { /* 存储不可用时使用传入的初始比例。 */ }
      }
      sizes = normalize(next);
      collapsedPane = null;
    });
  });
  onDestroy(() => stopDragging());

  function saveSizes(input: [number, number]) {
    const [lower, upper] = bounds();
    const first = Number(Math.max(lower, Math.min(upper, input[0])).toFixed(2));
    sizes = [first, Number((100 - first).toFixed(2))];
    onResize?.([...sizes]);
    if (storageKey && typeof localStorage !== 'undefined') {
      try { localStorage.setItem(`svadmin_splitter_${storageKey}`, JSON.stringify(sizes)); }
      catch { /* 禁用浏览器存储不影响拖拽。 */ }
    }
  }
  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0 || !containerEl || (event.target instanceof Element && event.target.closest('button'))) return;
    event.preventDefault();
    stopDragging();
    const horizontal = direction === 'horizontal';
    const rect = containerEl.getBoundingClientRect();
    const total = horizontal ? rect.width : rect.height;
    if (total <= 0) return;
    isDragging = true;
    const start = horizontal ? event.clientX : event.clientY;
    const first = sizes[0];
    function move(next: PointerEvent) {
      if (next.pointerId !== event.pointerId) return;
      const position = horizontal ? next.clientX : next.clientY;
      const changed = first + (position - start) / total * 100;
      saveSizes([changed, 100 - changed]);
    }
    stopDragging = () => {
      isDragging = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
      window.removeEventListener('blur', stopDragging);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);
    window.addEventListener('blur', stopDragging);
  }
  function handleDoubleClick() {
    collapsedPane = null;
    saveSizes(normalize([50, 50]));
    onCollapse?.(null);
  }
  function toggleCollapse(pane: 'first' | 'second') {
    if (!collapsible && collapsedPane !== pane) return;
    stopDragging();
    collapsedPane = collapsedPane === pane ? null : pane;
    onCollapse?.(collapsedPane);
  }
  function handleKeydown(event: KeyboardEvent) {
    const previous = direction === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
    const next = direction === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
    if (![previous, next, 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const [lower, upper] = bounds();
    const first = event.key === 'Home' ? lower : event.key === 'End' ? upper :
      Math.max(lower, Math.min(upper, sizes[0] + (event.key === previous ? -2 : 2)));
    saveSizes([first, 100 - first]);
  }
  const isHorizontal = $derived(direction === 'horizontal');
</script>

<div
  bind:this={containerEl}
  class="resizable-splitter relative flex h-full w-full overflow-hidden {isHorizontal ? 'flex-row' : 'flex-col'} {isDragging ? 'select-none' : ''} {className}"
  data-svadmin-component="ResizableSplitter"
>
  <!-- First Pane -->
  <div
    class="relative min-h-0 min-w-0 overflow-auto transition-all duration-75 {collapsedPane === 'first' ? 'hidden' : ''}"
    style:flex="{sizes[0]} 1 0%"
  >
    {#if firstPane}
      {@render firstPane()}
    {:else}
      <div class="flex h-full w-full items-center justify-center p-4 text-xs text-muted-foreground">
        面板 1 (First Pane)
      </div>
    {/if}
  </div>

  <!-- Splitter Gutter Divider -->
  {#if collapsedPane === null}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (可调整的分隔线支持键盘和指针操作。) -->
    <div
      class="group relative z-10 flex shrink-0 items-center justify-center bg-border/60 transition-colors hover:bg-primary/30 active:bg-primary {isHorizontal ? 'cursor-col-resize h-full' : 'cursor-row-resize w-full'} {isDragging ? 'bg-primary' : ''}"
      style="{isHorizontal ? `width: ${gutterSize}px` : `height: ${gutterSize}px`}; touch-action: none;"
      role="separator"
      tabindex="0"
      aria-label="拖拽调整分栏大小"
      aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
      aria-valuenow={sizes[0]}
      aria-valuemin={bounds()[0]}
      aria-valuemax={bounds()[1]}
      onpointerdown={handlePointerDown}
      ondblclick={handleDoubleClick}
      onkeydown={handleKeydown}
    >
      <!-- Center Grip Dots -->
      <div class="pointer-events-none flex items-center justify-center opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 {isHorizontal ? 'flex-col gap-1' : 'flex-row gap-1'}">
        <span class="h-1 w-1 rounded-full bg-foreground/60"></span>
        <span class="h-1 w-1 rounded-full bg-foreground/60"></span>
        <span class="h-1 w-1 rounded-full bg-foreground/60"></span>
      </div>

      <!-- Quick collapse helper triggers on hover -->
      {#if collapsible}
        <div class="absolute flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 {isHorizontal ? 'flex-col' : 'flex-row'}">
          <button
            type="button"
            class="flex h-4 w-4 items-center justify-center rounded-full bg-card text-[9px] text-muted-foreground shadow-xs hover:bg-primary hover:text-primary-foreground"
            title="折叠左/上方"
            onclick={(e) => {
              e.stopPropagation();
              toggleCollapse('first');
            }}
          >
            {isHorizontal ? '‹' : '▲'}
          </button>
          <button
            type="button"
            class="flex h-4 w-4 items-center justify-center rounded-full bg-card text-[9px] text-muted-foreground shadow-xs hover:bg-primary hover:text-primary-foreground"
            title="折叠右/下方"
            onclick={(e) => {
              e.stopPropagation();
              toggleCollapse('second');
            }}
          >
            {isHorizontal ? '›' : '▼'}
          </button>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Collapsed Restore Bar -->
    <div
      class="relative z-10 flex shrink-0 items-center justify-center border-border bg-muted/40 p-1 {isHorizontal ? 'h-full border-x' : 'w-full border-y'}"
    >
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-xs hover:bg-muted"
        onclick={() => {
          if (collapsedPane) toggleCollapse(collapsedPane);
        }}
      >
        <span>恢复面板</span>
        <span class="text-[10px] text-muted-foreground">({collapsedPane === 'first' ? '左/上' : '右/下'})</span>
      </button>
    </div>
  {/if}

  <!-- Second Pane -->
  <div
    class="relative min-h-0 min-w-0 overflow-auto transition-all duration-75 {collapsedPane === 'second' ? 'hidden' : ''}"
    style:flex="{sizes[1]} 1 0%"
  >
    {#if secondPane}
      {@render secondPane()}
    {:else}
      <div class="flex h-full w-full items-center justify-center p-4 text-xs text-muted-foreground">
        面板 2 (Second Pane)
      </div>
    {/if}
  </div>
</div>
