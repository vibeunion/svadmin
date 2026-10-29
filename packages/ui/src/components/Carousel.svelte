<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { onDestroy } from 'svelte';
  import { Button } from './ui/button/index.js';
  import { cn } from '../utils.js';

  interface Props {
    count: number;
    index?: number;
    autoPlay?: boolean;
    interval?: number;
    loop?: boolean;
    ariaLabel?: string;
    children?: Snippet<[number]>;
    class?: string;
    onchange?: (index: number) => void;
  }

  let {
    count,
    index = $bindable(0),
    autoPlay = false,
    interval = 5000,
    loop = true,
    ariaLabel = 'Carousel',
    children,
    class: className = '',
    onchange,
  }: Props = $props();

  let paused = $state(false);
  let timer: ReturnType<typeof setInterval> | undefined;

  function clamp(value: number): number {
    if (count <= 0) return 0;
    if (loop) return (value + count) % count;
    return Math.max(0, Math.min(count - 1, value));
  }

  function go(next: number): void {
    const value = clamp(next);
    if (value === index) return;
    index = value;
    onchange?.(value);
  }

  $effect(() => {
    if (timer) clearInterval(timer);
    timer = undefined;
    if (!autoPlay || paused || count <= 1 || typeof window === 'undefined') return;
    timer = setInterval(() => go(index + 1), interval);
    return () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
  });

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
</script>

<section
  class={cn('svadmin-carousel', className)}
  aria-label={ariaLabel}
  aria-roledescription="carousel"
  onmouseenter={() => (paused = true)}
  onmouseleave={() => (paused = false)}
  onfocusin={() => (paused = true)}
  onfocusout={() => (paused = false)}
>
  <div class="svadmin-carousel__viewport">
    <div class="svadmin-carousel__track" style:transform={`translateX(-${index * 100}%)`}>
      {#each Array.from({ length: count }, (_, item) => item) as item (item)}
        <div class="svadmin-carousel__slide" role="group" aria-roledescription="slide" aria-label={`${item + 1} / ${count}`} aria-hidden={item !== index}>
          {@render children?.(item)}
        </div>
      {/each}
    </div>
    {#if count > 1}
      <Button variant="secondary" size="icon-sm" class="svadmin-carousel__prev" aria-label="Previous slide" onclick={() => go(index - 1)}><ChevronLeft size={16} /></Button>
      <Button variant="secondary" size="icon-sm" class="svadmin-carousel__next" aria-label="Next slide" onclick={() => go(index + 1)}><ChevronRight size={16} /></Button>
    {/if}
  </div>
  {#if count > 1}
    <div class="svadmin-carousel__dots" role="tablist" aria-label="Slides">
      {#each Array.from({ length: count }, (_, item) => item) as item (item)}
        <button type="button" role="tab" aria-selected={item === index} aria-label={`Go to slide ${item + 1}`} onclick={() => go(item)}></button>
      {/each}
    </div>
  {/if}
</section>

<style>
  .svadmin-carousel { display: grid; gap: var(--svadmin-space-3); min-width: 0; }
  .svadmin-carousel__viewport { position: relative; overflow: hidden; border-radius: var(--radius-lg); }
  .svadmin-carousel__track { display: flex; transition: transform 220ms ease; }
  .svadmin-carousel__slide { flex: 0 0 100%; min-width: 0; }
  .svadmin-carousel__prev, .svadmin-carousel__next { position: absolute; inset-block-start: 50%; transform: translateY(-50%); }
  .svadmin-carousel__prev { inset-inline-start: var(--svadmin-space-2); }
  .svadmin-carousel__next { inset-inline-end: var(--svadmin-space-2); }
  .svadmin-carousel__dots { display: flex; justify-content: center; gap: var(--svadmin-space-1); }
  .svadmin-carousel__dots button { width: 0.5rem; height: 0.5rem; padding: 0; border: 0; border-radius: 999px; background: var(--border); }
  .svadmin-carousel__dots button[aria-selected='true'] { width: 1.25rem; background: var(--primary); }
  @media (prefers-reduced-motion: reduce) { .svadmin-carousel__track { transition: none; } }
</style>