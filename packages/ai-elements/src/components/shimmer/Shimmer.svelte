<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { SvelteHTMLElements } from 'svelte/elements';

  export interface TextShimmerProps {
    text?: string;
    as?: keyof SvelteHTMLElements & string;
    class?: string;
    duration?: number;
    spread?: number;
    children?: Snippet;
    [key: string]: unknown;
  }
</script>

<script lang="ts">
  import { cn } from '../../utils.js';

  let {
    text,
    as = 'p',
    class: className = '',
    duration = 2,
    spread = 2,
    children,
    style,
    ...rest
  }: TextShimmerProps = $props();

  const dynamicSpread = $derived(Math.max((text?.length ?? 12) * spread, 12));
  const computedStyle = $derived(`--svadmin-ai-shimmer-duration: ${duration}s; --svadmin-ai-shimmer-spread: ${dynamicSpread}px; ${typeof style === 'string' ? style : ''}`);
</script>

<svelte:element
  this={as}
  class={cn('svadmin-ai svadmin-ai-shimmer', className)}
  style={computedStyle}
  data-slot="shimmer"
  {...rest}
>
  {#if text !== undefined}{text}{:else}{@render children?.()}{/if}
</svelte:element>

<style>
  .svadmin-ai-shimmer {
    display: inline-block;
    color: transparent;
    background-image:
      linear-gradient(
        90deg,
        transparent calc(50% - var(--svadmin-ai-shimmer-spread)),
        var(--foreground, currentColor) 50%,
        transparent calc(50% + var(--svadmin-ai-shimmer-spread))
      ),
      linear-gradient(var(--muted-foreground, currentColor), var(--muted-foreground, currentColor));
    background-position: 100% center, center;
    background-size: 250% 100%, auto;
    background-repeat: no-repeat, no-repeat;
    background-clip: text;
    animation: svadmin-ai-shimmer var(--svadmin-ai-shimmer-duration) linear infinite;
  }

  @keyframes svadmin-ai-shimmer {
    to { background-position: -100% center, center; }
  }

  @media (prefers-reduced-motion: reduce) {
    .svadmin-ai-shimmer {
      color: var(--muted-foreground, currentColor);
      background: none;
      animation: none;
    }
  }
</style>
