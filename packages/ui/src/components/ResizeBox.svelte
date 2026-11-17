<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onDestroy } from 'svelte';
  import { cn } from '../utils.js';

  interface Props {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    min?: number | [number, number];
    max?: number | [number, number];
    direction?: 'both' | 'horizontal' | 'vertical';
    directions?: Array<'left' | 'right' | 'top' | 'bottom'>;
    disabled?: boolean;
    label?: string;
    class?: string;
    children?: Snippet;
  }

  let {
    width = $bindable(),
    height = $bindable(),
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    min,
    max,
    direction = 'both',
    directions,
    disabled = false,
    label = 'Resize panel',
    class: className = '',
    children,
  }: Props = $props();

  const resolvedMinWidth = $derived(
    minWidth ?? (Array.isArray(min) ? min[0] : typeof min === 'number' ? min : 120)
  );
  const resolvedMinHeight = $derived(
    minHeight ?? (Array.isArray(min) ? min[1] : typeof min === 'number' ? min : 80)
  );
  const resolvedMaxWidth = $derived(
    maxWidth ?? (Array.isArray(max) ? max[0] : typeof max === 'number' ? max : undefined)
  );
  const resolvedMaxHeight = $derived(
    maxHeight ?? (Array.isArray(max) ? max[1] : typeof max === 'number' ? max : undefined)
  );

  const resolvedDirection = $derived.by(() => {
    if (directions && directions.length > 0) {
      const hasHorizontal = directions.includes('left') || directions.includes('right');
      const hasVertical = directions.includes('top') || directions.includes('bottom');
      if (hasHorizontal && hasVertical) return 'both';
      if (hasHorizontal) return 'horizontal';
      if (hasVertical) return 'vertical';
    }
    return direction;
  });

  let element = $state<HTMLDivElement | null>(null);
  const initialWidth = width;
  const initialHeight = height;
  let dragging = $state(false);
  let start: { x: number; y: number; width: number; height: number } | null = null;

  const clamp = (value: number, min: number, max?: number): number => Math.min(max ?? value, Math.max(min, value));

  function resize(nextWidth: number, nextHeight: number): void {
    if (resolvedDirection !== 'vertical') width = clamp(nextWidth, resolvedMinWidth, resolvedMaxWidth);
    if (resolvedDirection !== 'horizontal') height = clamp(nextHeight, resolvedMinHeight, resolvedMaxHeight);
  }

  function onPointerMove(event: PointerEvent): void {
    if (!start) return;
    resize(start.width + event.clientX - start.x, start.height + event.clientY - start.y);
  }

  function stop(): void {
    start = null;
    dragging = false;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
  }

  function startResize(event: PointerEvent): void {
    if (disabled || !element) return;
    event.preventDefault();
    start = { x: event.clientX, y: event.clientY, width: element.offsetWidth, height: element.offsetHeight };
    dragging = true;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (disabled || !element) return;
    const step = event.shiftKey ? 20 : 4;
    let nextWidth = element.offsetWidth;
    let nextHeight = element.offsetHeight;
    if (event.key === 'ArrowRight') nextWidth += step;
    else if (event.key === 'ArrowLeft') nextWidth -= step;
    else if (event.key === 'ArrowDown') nextHeight += step;
    else if (event.key === 'ArrowUp') nextHeight -= step;
    else return;
    event.preventDefault();
    resize(nextWidth, nextHeight);
  }

  function reset(): void {
    width = initialWidth;
    height = initialHeight;
  }

  onDestroy(stop);
</script>

<div
  bind:this={element}
  class={cn('svadmin-resize-box', className)}
  data-dragging={dragging ? 'true' : 'false'}
  data-direction={resolvedDirection}
  style:width={width === undefined ? undefined : `${width}px`}
  style:height={height === undefined ? undefined : `${height}px`}
>
  <div class="svadmin-resize-box__content">{@render children?.()}</div>
  {#if !disabled}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="svadmin-resize-box__handle"
      role="separator"
      tabindex="0"
      aria-label={`${label}: use arrow keys to resize, double click to reset`}
      aria-orientation={resolvedDirection === 'vertical' ? 'horizontal' : 'vertical'}
      aria-valuenow={resolvedDirection === 'vertical' ? (height ?? element?.offsetHeight ?? resolvedMinHeight) : (width ?? element?.offsetWidth ?? resolvedMinWidth)}
      aria-valuemin={resolvedDirection === 'vertical' ? resolvedMinHeight : resolvedMinWidth}
      aria-valuemax={resolvedDirection === 'vertical' ? (resolvedMaxHeight ?? undefined) : (resolvedMaxWidth ?? undefined)}
      onpointerdown={startResize}
      onkeydown={onKeydown}
      ondblclick={reset}
    ></div>
  {/if}
</div>

<style>
  .svadmin-resize-box {
    position: relative;
    min-width: 0;
    overflow: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--card);
  }
  .svadmin-resize-box__content { min-width: 0; padding: var(--svadmin-space-3); }
  .svadmin-resize-box[data-dragging='true'] { user-select: none; }
  .svadmin-resize-box__handle {
    position: absolute;
    inset-inline-end: 0;
    inset-block-end: 0;
    width: 1rem;
    height: 1rem;
    padding: 0;
    border: 0;
    background: linear-gradient(135deg, transparent 45%, var(--border) 45%, var(--border) 55%, transparent 55%);
    cursor: nwse-resize;
    touch-action: none;
  }
  .svadmin-resize-box[data-direction='horizontal'] .svadmin-resize-box__handle { cursor: ew-resize; }
  .svadmin-resize-box[data-direction='vertical'] .svadmin-resize-box__handle { cursor: ns-resize; }
  .svadmin-resize-box__handle:focus-visible { outline: var(--svadmin-focus-width) solid var(--ring); outline-offset: var(--svadmin-focus-offset); }
</style>
