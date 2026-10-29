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
    direction?: 'both' | 'horizontal' | 'vertical';
    disabled?: boolean;
    label?: string;
    class?: string;
    children?: Snippet;
  }

  let {
    width = $bindable(),
    height = $bindable(),
    minWidth = 120,
    minHeight = 80,
    maxWidth,
    maxHeight,
    direction = 'both',
    disabled = false,
    label = 'Resize panel',
    class: className = '',
    children,
  }: Props = $props();

  let element = $state<HTMLDivElement | null>(null);
  let dragging = $state(false);
  let start: { x: number; y: number; width: number; height: number } | null = null;

  const clamp = (value: number, min: number, max?: number): number => Math.min(max ?? value, Math.max(min, value));

  function resize(nextWidth: number, nextHeight: number): void {
    if (direction !== 'vertical') width = clamp(nextWidth, minWidth, maxWidth);
    if (direction !== 'horizontal') height = clamp(nextHeight, minHeight, maxHeight);
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

  onDestroy(stop);
</script>

<div
  bind:this={element}
  class={cn('svadmin-resize-box', className)}
  data-dragging={dragging ? 'true' : 'false'}
  data-direction={direction}
  style:width={width === undefined ? undefined : `${width}px`}
  style:height={height === undefined ? undefined : `${height}px`}
>
  <div class="svadmin-resize-box__content">{@render children?.()}</div>
  {#if !disabled}
    <button
      type="button"
      class="svadmin-resize-box__handle"
      aria-label={`${label}: use arrow keys to resize`}
      onpointerdown={startResize}
      onkeydown={onKeydown}
    ></button>
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
  .svadmin-resize-box__handle:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
</style>