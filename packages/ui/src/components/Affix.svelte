<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { cn } from '../utils.js';

  interface Props {
    top?: number;
    bottom?: number;
    target?: string;
    children: Snippet;
    class?: string;
  }

  let { top = 16, bottom, target = 'window', children, class: className = '' }: Props = $props();
  let stuck = $state(false);
  let sentinel: HTMLDivElement | undefined;
  let observer: IntersectionObserver | undefined;

  onMount(() => {
    if (!sentinel) return;
    observer = new IntersectionObserver(([entry]) => {
      if (entry) stuck = !entry.isIntersecting;
    }, { root: target === 'window' ? null : document.querySelector(target), rootMargin: `-${top}px 0px 0px 0px`, threshold: [0] });
    observer.observe(sentinel);
    return () => observer?.disconnect();
  });
</script>

<div bind:this={sentinel} aria-hidden="true" class="svadmin-affix__sentinel"></div>
<div
  class={cn('svadmin-affix', className)}
  class:is-stuck={stuck}
  style:top={`${top}px`}
  style:bottom={bottom === undefined ? undefined : `${bottom}px`}
>
  {@render children()}
</div>

<style>
  .svadmin-affix__sentinel { height: 1px; }
  .svadmin-affix { position: sticky; z-index: 10; }
  .svadmin-affix.is-stuck { box-shadow: var(--svadmin-shadow-surface); }
</style>