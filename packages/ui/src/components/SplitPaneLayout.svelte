<script lang="ts">
  import { untrack } from 'svelte';
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  interface Props {
    direction?: 'horizontal' | 'vertical';
    initialRatio?: number;
    minRatio?: number;
    maxRatio?: number;
    pane1?: Snippet;
    pane2?: Snippet;
    class?: string;
  }

  let {
    direction = 'horizontal',
    initialRatio = 0.3,
    minRatio = 0.15,
    maxRatio = 0.85,
    pane1,
    pane2,
    class: className = '',
  }: Props = $props();

  let containerEl = $state<HTMLDivElement | null>(null);
  let ratio = $state(untrack(() => initialRatio));
  let isDragging = $state(false);

  function startDrag(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    isDragging = true;

    function onMove(ev: MouseEvent | TouchEvent) {
      if (!containerEl) return;
      const rect = containerEl.getBoundingClientRect();

      const clientPos =
        direction === 'horizontal'
          ? ('touches' in ev ? ev.touches[0].clientX - rect.left : ev.clientX - rect.left)
          : ('touches' in ev ? ev.touches[0].clientY - rect.top : ev.clientY - rect.top);
      const totalSize = direction === 'horizontal' ? rect.width : rect.height;

      if (totalSize > 0) {
        const calculatedRatio = Math.max(minRatio, Math.min(maxRatio, clientPos / totalSize));
        ratio = calculatedRatio;
      }
    }

    function onEnd() {
      isDragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  }
</script>

<div
  bind:this={containerEl}
  class={cn(
    'relative flex w-full h-full min-h-72 rounded-xl border border-border bg-card shadow-xs overflow-hidden select-none',
    direction === 'horizontal' ? 'flex-row' : 'flex-col',
    className
  )}
>
  <!-- Pane 1 -->
  <div
    style={direction === 'horizontal' ? `width: ${ratio * 100}%;` : `height: ${ratio * 100}%;`}
    class="overflow-auto shrink-0 select-text p-4"
  >
    {#if pane1}
      {@render pane1()}
    {/if}
  </div>

  <!-- Resizer Splitter -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    onmousedown={startDrag}
    ontouchstart={startDrag}
    class={cn(
      'shrink-0 bg-border hover:bg-primary/60 transition-colors z-10 flex items-center justify-center cursor-pointer',
      direction === 'horizontal'
        ? 'w-1.5 cursor-col-resize hover:w-2'
        : 'h-1.5 cursor-row-resize hover:h-2',
      isDragging ? 'bg-primary w-2' : ''
    )}
  >
    <div
      class={cn(
        'rounded-full bg-muted-foreground/40',
        direction === 'horizontal' ? 'h-6 w-0.5' : 'w-6 h-0.5'
      )}
    ></div>
  </div>

  <!-- Pane 2 -->
  <div
    style={direction === 'horizontal' ? `width: ${(1 - ratio) * 100}%;` : `height: ${(1 - ratio) * 100}%;`}
    class="overflow-auto flex-1 select-text p-4"
  >
    {#if pane2}
      {@render pane2()}
    {/if}
  </div>
</div>
