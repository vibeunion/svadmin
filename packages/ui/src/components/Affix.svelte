<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { cn } from '../utils.js';

  interface Props {
    top?: number;
    offsetTop?: number;
    bottom?: number;
    offsetBottom?: number;
    target?: string;
    children: Snippet;
    class?: string;
    style?: string;
    onchange?: (stuck: boolean) => void;
    onChange?: (stuck: boolean) => void;
  }

  let {
    top = 16,
    offsetTop,
    bottom,
    offsetBottom,
    target = 'window',
    children,
    class: className = '',
    style,
    onchange,
    onChange,
  }: Props = $props();
  const effectiveTop = $derived(offsetTop ?? top);
  const effectiveBottom = $derived(offsetBottom ?? bottom);
  let stuck = $state(false);
  let sentinel: HTMLDivElement | undefined;
  let observer: IntersectionObserver | undefined;

  onMount(() => {
    if (!sentinel) return;
    observer = new IntersectionObserver(([entry]) => {
      if (entry) {
        const nextStuck = !entry.isIntersecting;
        if (stuck !== nextStuck) {
          stuck = nextStuck;
          onchange?.(nextStuck);
          onChange?.(nextStuck);
        }
      }
    }, { root: target === 'window' ? null : document.querySelector(target), rootMargin: `-${effectiveTop}px 0px 0px 0px`, threshold: [0] });
    observer.observe(sentinel);
    return () => observer?.disconnect();
  });
</script>

<div bind:this={sentinel} aria-hidden="true" class="svadmin-affix__sentinel"></div>
<div
  class={cn('svadmin-affix', className)}
  class:is-stuck={stuck}
  style:top={`${effectiveTop}px`}
  style:bottom={effectiveBottom === undefined ? undefined : `${effectiveBottom}px`}
  {style}
>
  {@render children()}
</div>

<style>
  .svadmin-affix__sentinel { height: 1px; }
  .svadmin-affix { position: sticky; z-index: 10; }
  .svadmin-affix.is-stuck { box-shadow: var(--svadmin-shadow-surface); }
</style>
