<script lang="ts">
  import { untrack } from 'svelte';
  import { onMount, type Snippet } from 'svelte';

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
  // Seeded from the initial prop; drag/collapse interactions own the value afterwards.
  let sizes = $state<[number, number]>(untrack(() => [initialSizes[0], initialSizes[1]]));
  let isDragging = $state<boolean>(false);
  let collapsedPane = $state<'first' | 'second' | null>(null);

  onMount(() => {
    if (storageKey && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(`svadmin_splitter_${storageKey}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 2) {
            sizes = [parsed[0], parsed[1]];
          }
        }
      } catch {
        // Ignore localStorage error
      }
    }
  });

  function saveSizes(newSizes: [number, number]) {
    sizes = newSizes;
    onResize?.(newSizes);
    if (storageKey && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`svadmin_splitter_${storageKey}`, JSON.stringify(newSizes));
      } catch {
        // Ignore error
      }
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if (e.button !== 0 || !containerEl) return;
    e.preventDefault();
    isDragging = true;

    const startX = e.clientX;
    const startY = e.clientY;
    const rect = containerEl.getBoundingClientRect();
    const totalSize = direction === 'horizontal' ? rect.width : rect.height;
    const startSizes: [number, number] = [sizes[0], sizes[1]];

    function onMouseMove(moveEvent: MouseEvent) {
      if (!isDragging || totalSize <= 0) return;

      const deltaPx = direction === 'horizontal'
        ? moveEvent.clientX - startX
        : moveEvent.clientY - startY;

      const deltaPercent = (deltaPx / totalSize) * 100;
      let newFirst = startSizes[0] + deltaPercent;
      let newSecond = startSizes[1] - deltaPercent;

      // Bound clamping
      const min1 = minSizes[0];
      const max1 = maxSizes[0];
      const min2 = minSizes[1];
      const max2 = maxSizes[1];

      if (newFirst < min1) {
        newFirst = min1;
        newSecond = 100 - min1;
      } else if (newFirst > max1) {
        newFirst = max1;
        newSecond = 100 - max1;
      }

      if (newSecond < min2) {
        newSecond = min2;
        newFirst = 100 - min2;
      } else if (newSecond > max2) {
        newSecond = max2;
        newFirst = 100 - max2;
      }

      collapsedPane = null;
      saveSizes([Number(newFirst.toFixed(2)), Number(newSecond.toFixed(2))]);
    }

    function onMouseUp() {
      isDragging = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function handleDoubleClick() {
    collapsedPane = null;
    saveSizes([50, 50]);
    onCollapse?.(null);
  }

  function toggleCollapse(pane: 'first' | 'second') {
    if (!collapsible) return;
    if (collapsedPane === pane) {
      collapsedPane = null;
      saveSizes([50, 50]);
      onCollapse?.(null);
    } else {
      collapsedPane = pane;
      onCollapse?.(pane);
    }
  }

  const isHorizontal = $derived(() => direction === 'horizontal');
</script>

<div
  bind:this={containerEl}
  class="resizable-splitter relative flex h-full w-full overflow-hidden {isHorizontal() ? 'flex-row' : 'flex-col'} {isDragging ? 'select-none' : ''} {className}"
  data-svadmin-component="ResizableSplitter"
>
  <!-- First Pane -->
  <div
    class="relative overflow-auto transition-all duration-75 {collapsedPane === 'first' ? 'hidden' : ''}"
    style="{isHorizontal() ? `width: ${collapsedPane === 'second' ? 100 : sizes[0]}%` : `height: ${collapsedPane === 'second' ? 100 : sizes[0]}%`};"
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
    <!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions -->
    <div
      class="group relative z-10 flex shrink-0 items-center justify-center bg-border/60 transition-colors hover:bg-primary/30 active:bg-primary {isHorizontal() ? 'cursor-col-resize h-full' : 'cursor-row-resize w-full'} {isDragging ? 'bg-primary' : ''}"
      style="{isHorizontal() ? `width: ${gutterSize}px` : `height: ${gutterSize}px`};"
      role="separator"
      tabindex="0"
      aria-label="拖拽调整分栏大小"
      aria-orientation={direction}
      aria-valuenow={sizes[0]}
      aria-valuemin={minSizes[0]}
      aria-valuemax={maxSizes[0]}
      onmousedown={handleMouseDown}
      ondblclick={handleDoubleClick}
      onkeydown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          saveSizes([Math.max(minSizes[0], sizes[0] - 2), Math.min(maxSizes[1], sizes[1] + 2)]);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          saveSizes([Math.min(maxSizes[0], sizes[0] + 2), Math.max(minSizes[1], sizes[1] - 2)]);
        } else if (e.key === 'Home') {
          handleDoubleClick();
        }
      }}
    >
      <!-- Center Grip Dots -->
      <div class="pointer-events-none flex items-center justify-center opacity-60 group-hover:opacity-100 {isHorizontal() ? 'flex-col gap-1' : 'flex-row gap-1'}">
        <span class="h-1 w-1 rounded-full bg-foreground/60"></span>
        <span class="h-1 w-1 rounded-full bg-foreground/60"></span>
        <span class="h-1 w-1 rounded-full bg-foreground/60"></span>
      </div>

      <!-- Quick collapse helper triggers on hover -->
      {#if collapsible}
        <div class="absolute flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 {isHorizontal() ? 'flex-col' : 'flex-row'}">
          <button
            type="button"
            class="flex h-4 w-4 items-center justify-center rounded-full bg-card text-[9px] text-muted-foreground shadow-xs hover:bg-primary hover:text-primary-foreground"
            title="折叠左/上方"
            onclick={(e) => {
              e.stopPropagation();
              toggleCollapse('first');
            }}
          >
            {isHorizontal() ? '‹' : '▲'}
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
            {isHorizontal() ? '›' : '▼'}
          </button>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Collapsed Restore Bar -->
    <div
      class="relative z-10 flex shrink-0 items-center justify-center border-border bg-muted/40 p-1 {isHorizontal() ? 'h-full border-x' : 'w-full border-y'}"
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
    class="relative overflow-auto transition-all duration-75 {collapsedPane === 'second' ? 'hidden' : ''}"
    style="{isHorizontal() ? `width: ${collapsedPane === 'first' ? 100 : sizes[1]}%` : `height: ${collapsedPane === 'first' ? 100 : sizes[1]}%`};"
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
