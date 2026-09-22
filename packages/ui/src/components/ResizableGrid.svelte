<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  export interface GridItem {
    id: string;
    /** Column index (0-based). */
    x: number;
    /** Row index (0-based). */
    y: number;
    /** Width in columns. */
    w: number;
    /** Height in rows. */
    h: number;
  }

  interface Props {
    items: GridItem[];
    /** Number of columns in the grid. */
    cols?: number;
    /** Height of a single row in pixels. */
    rowHeight?: number;
    /** Gap between cells in pixels. */
    gap?: number;
    minW?: number;
    minH?: number;
    /** Enables move/resize handles. */
    editable?: boolean;
    ariaLabel?: string;
    class?: string;
    /** Renders each cell's content. Falls back to `children`. */
    item?: Snippet<[GridItem]>;
    children?: Snippet;
    onchange?: (items: GridItem[]) => void;
  }

  let {
    items = $bindable([]),
    cols = 12,
    rowHeight = 80,
    gap = 12,
    minW = 1,
    minH = 1,
    editable = true,
    ariaLabel = 'Grid layout',
    class: className = '',
    item: itemSnippet,
    children,
    onchange,
  }: Props = $props();

  let container = $state<HTMLElement | null>(null);

  const rows = $derived(Math.max(...items.map((entry) => entry.y + entry.h), 1));
  const height = $derived(`calc(${rows} * (var(--svadmin-grid-row) + ${gap}px) - ${gap}px)`);

  const clamp = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), Math.max(min, max));

  function commit(next: GridItem[]): void {
    items = next;
    onchange?.(next);
  }

  function move(item: GridItem, dxUnits: number, dyUnits: number): void {
    commit(items.map((entry) => entry.id === item.id
      ? {
          ...entry,
          x: clamp(item.x + dxUnits, 0, cols - item.w),
          y: Math.max(0, item.y + dyUnits),
        }
      : entry));
  }

  function resize(item: GridItem, dw: number, dh: number): void {
    commit(items.map((entry) => entry.id === item.id
      ? {
          ...entry,
          w: clamp(item.w + dw, minW, cols - item.x),
          h: Math.max(minH, item.h + dh),
        }
      : entry));
  }

  function startMove(event: PointerEvent, item: GridItem): void {
    if (!editable || event.button !== 0) return;
    event.preventDefault();

    const handle = event.currentTarget as HTMLElement;
    const rect = container?.getBoundingClientRect();
    const stepX = rect && rect.width > 0 ? (rect.width + gap) / cols : 80;
    const stepY = rowHeight + gap;
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { x: item.x, y: item.y };

    const onMove = (moveEvent: PointerEvent): void => {
      move(
        { ...item, x: origin.x, y: origin.y },
        Math.round((moveEvent.clientX - startX) / stepX),
        Math.round((moveEvent.clientY - startY) / stepY),
      );
    };
    onPointerGesture(handle, event.pointerId, onMove);
  }

  function startResize(event: PointerEvent, item: GridItem): void {
    if (!editable || event.button !== 0) return;
    event.preventDefault();

    const handle = event.currentTarget as HTMLElement;
    const rect = container?.getBoundingClientRect();
    const stepX = rect && rect.width > 0 ? (rect.width + gap) / cols : 80;
    const stepY = rowHeight + gap;
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { w: item.w, h: item.h };

    const onMove = (moveEvent: PointerEvent): void => {
      resize(
        { ...item, w: origin.w, h: origin.h },
        Math.round((moveEvent.clientX - startX) / stepX),
        Math.round((moveEvent.clientY - startY) / stepY),
      );
    };
    onPointerGesture(handle, event.pointerId, onMove);
  }

  function onPointerGesture(
    handle: HTMLElement,
    pointerId: number,
    onMove: (event: PointerEvent) => void,
  ): void {
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      try {
        handle.releasePointerCapture?.(pointerId);
      } catch {
        // Pointer capture may be unavailable or already released.
      }
    };
    try {
      handle.setPointerCapture?.(pointerId);
    } catch {
      // Pointer capture is optional; window listeners still track the gesture.
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function handleKeydown(event: KeyboardEvent, item: GridItem, mode: 'move' | 'resize'): void {
    if (!editable) return;
    let dx = 0;
    let dy = 0;
    if (event.key === 'ArrowRight') dx = 1;
    else if (event.key === 'ArrowLeft') dx = -1;
    else if (event.key === 'ArrowDown') dy = 1;
    else if (event.key === 'ArrowUp') dy = -1;
    else return;
    event.preventDefault();
    if (mode === 'move') move(item, dx, dy);
    else resize(item, dx, dy);
  }
</script>

<div
  bind:this={container}
  class={cn('svadmin-resizable-grid', className)}
  data-slot="resizable-grid"
  data-editable={editable ? 'true' : 'false'}
  style={`--svadmin-grid-row: ${rowHeight}px; height: ${height};`}
  role="group"
  aria-label={ariaLabel}
>
  {#each items as entry (entry.id)}
    <div
      class="svadmin-resizable-grid__item"
      data-grid-id={entry.id}
      style={`left: calc(${entry.x} * (100% + ${gap}px) / ${cols}); width: calc(${entry.w} * (100% + ${gap}px) / ${cols} - ${gap}px); top: calc(${entry.y} * (var(--svadmin-grid-row) + ${gap}px)); height: calc(${entry.h} * var(--svadmin-grid-row) + ${Math.max(entry.h - 1, 0) * gap}px);`}
    >
      <div class="svadmin-resizable-grid__content">
        {#if itemSnippet}{@render itemSnippet(entry)}{:else if children}{@render children()}{/if}
      </div>
      {#if editable}
        <button
          type="button"
          class="svadmin-resizable-grid__handle svadmin-resizable-grid__handle--move"
          aria-label={`Move ${entry.id}`}
          onpointerdown={(event) => startMove(event, entry)}
          onkeydown={(event) => handleKeydown(event, entry, 'move')}
        >⠿</button>
        <button
          type="button"
          class="svadmin-resizable-grid__handle svadmin-resizable-grid__handle--resize"
          aria-label={`Resize ${entry.id}`}
          onpointerdown={(event) => startResize(event, entry)}
          onkeydown={(event) => handleKeydown(event, entry, 'resize')}
        ></button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .svadmin-resizable-grid {
    position: relative;
    width: 100%;
  }

  .svadmin-resizable-grid__item {
    position: absolute;
    display: flex;
    overflow: hidden;
    border: 1px solid var(--border, currentColor);
    border-radius: min(var(--radius, 0.5rem), 0.75rem);
    background: var(--card, var(--background, transparent));
    color: var(--card-foreground, var(--foreground, currentColor));
  }

  .svadmin-resizable-grid__content { min-width: 0; flex: 1; padding: 0.75rem; }

  .svadmin-resizable-grid__handle {
    position: absolute;
    border: 0;
    padding: 0;
    background: transparent;
    color: var(--muted-foreground, currentColor);
    cursor: pointer;
  }
  .svadmin-resizable-grid__handle:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: -2px; }

  .svadmin-resizable-grid__handle--move {
    top: 0;
    right: 1.25rem;
    width: 1.25rem;
    height: 1.25rem;
    font-size: 0.75rem;
    line-height: 1;
    cursor: grab;
  }
  .svadmin-resizable-grid__handle--move:active { cursor: grabbing; }

  .svadmin-resizable-grid__handle--resize {
    right: 0;
    bottom: 0;
    width: 1rem;
    height: 1rem;
    background: linear-gradient(135deg, transparent 45%, var(--border, currentColor) 45%, var(--border, currentColor) 55%, transparent 55%, transparent 70%, var(--border, currentColor) 70%, var(--border, currentColor) 80%, transparent 80%);
    cursor: nwse-resize;
  }
</style>