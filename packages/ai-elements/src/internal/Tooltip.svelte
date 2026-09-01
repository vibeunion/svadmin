<script module lang="ts">
  import type { Snippet } from 'svelte';

  export interface TooltipTriggerState {
    describedBy?: string;
  }

  export interface TooltipProps {
    content?: string;
    children: Snippet<[TooltipTriggerState]>;
    delay?: number;
  }
</script>

<script lang="ts">
  import { onMount, tick } from 'svelte';

  let { content, children, delay = 250 }: TooltipProps = $props();
  const tooltipId = $props.id();
  let anchor = $state<HTMLSpanElement>();
  let tooltip = $state<HTMLDivElement>();
  let open = $state(false);
  let left = $state(0);
  let top = $state(0);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function portal(node: HTMLElement): { destroy(): void } {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      },
    };
  }

  function clearTimer(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }

  function show(immediate = false): void {
    if (!content) return;
    clearTimer();
    if (immediate) {
      open = true;
      void position();
      return;
    }
    timer = setTimeout(() => {
      open = true;
      void position();
    }, delay);
  }

  function hide(): void {
    clearTimer();
    open = false;
  }

  async function position(): Promise<void> {
    if (!open) return;
    await tick();
    if (!anchor || !tooltip) return;

    const anchorRect = anchor.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 8;
    const centeredLeft = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;
    left = Math.min(
      Math.max(centeredLeft, viewportPadding),
      Math.max(viewportPadding, window.innerWidth - tooltipRect.width - viewportPadding),
    );
    const above = anchorRect.top - tooltipRect.height - gap;
    top = above >= viewportPadding ? above : anchorRect.bottom + gap;
  }

  function handleFocusOut(event: FocusEvent): void {
    if (!anchor?.contains(event.relatedTarget as Node | null)) hide();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && open) hide();
  }

  onMount(() => {
    const handleScroll = () => void position();
    document.addEventListener('scroll', handleScroll, true);
    return () => document.removeEventListener('scroll', handleScroll, true);
  });
</script>

<svelte:window onkeydown={handleKeydown} onresize={position} onscroll={position} />

<span
  bind:this={anchor}
  class="svadmin-ai-tooltip__anchor"
  role="presentation"
  onpointerenter={() => show()}
  onpointerleave={hide}
  onfocusin={() => show(true)}
  onfocusout={handleFocusOut}
>
  {@render children({ describedBy: content ? tooltipId : undefined })}
</span>

{#if content && open}
  <div
    use:portal
    bind:this={tooltip}
    id={tooltipId}
    class="svadmin-ai-tooltip"
    role="tooltip"
    style:left={`${left}px`}
    style:top={`${top}px`}
  >
    {content}
  </div>
{/if}

<style>
  .svadmin-ai-tooltip__anchor { display: inline-flex; }
  .svadmin-ai-tooltip { position: fixed; z-index: 1000; width: max-content; max-width: min(16rem, calc(100vw - 1rem)); padding: 0.375rem 0.5rem; border: 1px solid var(--border, transparent); border-radius: min(var(--radius, 0.5rem), 0.375rem); background: var(--popover, var(--foreground, CanvasText)); color: var(--popover-foreground, var(--background, Canvas)); box-shadow: 0 0.25rem 0.75rem color-mix(in srgb, var(--foreground, CanvasText) 14%, transparent); font-size: 0.75rem; line-height: 1.25; pointer-events: none; }
</style>
