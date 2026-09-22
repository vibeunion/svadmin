<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  interface Props {
    /** Plain text shortcut; ignored when `children` is provided. */
    text?: string;
    children?: Snippet;
    /** Seconds for one full loop. */
    duration?: number;
    direction?: 'left' | 'right';
    vertical?: boolean;
    /** Copies of the content used to build a seamless loop. */
    repeat?: number;
    pauseOnHover?: boolean;
    /** Fades the leading and trailing edges. */
    fade?: boolean;
    ariaLabel?: string;
    class?: string;
  }

  let {
    text,
    children,
    duration = 14,
    direction = 'left',
    vertical = false,
    repeat = 2,
    pauseOnHover = true,
    fade = true,
    ariaLabel,
    class: className = '',
  }: Props = $props();

  const copies = $derived(Math.max(2, Math.round(repeat)));
  const safeDuration = $derived(duration > 0 ? duration : 14);
</script>

<div
  class={cn('svadmin-marquee', className)}
  data-slot="marquee"
  data-direction={direction}
  data-vertical={vertical ? 'true' : 'false'}
  data-pause={pauseOnHover ? 'true' : 'false'}
  data-fade={fade ? 'true' : 'false'}
  role="marquee"
  aria-label={ariaLabel}
>
  <div
    class="svadmin-marquee__track"
    style={`--svadmin-marquee-duration: ${safeDuration}s; --svadmin-marquee-repeat: ${copies};`}
  >
    {#each Array.from({ length: copies }) as _, index (index)}
      <div class="svadmin-marquee__item" aria-hidden={index > 0 ? 'true' : undefined}>
        {#if children}{@render children()}{:else}{text}{/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .svadmin-marquee {
    position: relative;
    overflow: hidden;
    color: inherit;
  }

  .svadmin-marquee[data-fade='true'] {
    mask-image: linear-gradient(to right, transparent, currentColor 8%, currentColor 92%, transparent);
  }

  .svadmin-marquee__track {
    display: flex;
    width: max-content;
    animation: svadmin-marquee-scroll var(--svadmin-marquee-duration, 14s) linear infinite;
    will-change: transform;
  }

  .svadmin-marquee[data-direction='right'] .svadmin-marquee__track { animation-direction: reverse; }
  .svadmin-marquee[data-vertical='true'] .svadmin-marquee__track { flex-direction: column; }
  .svadmin-marquee[data-pause='true']:hover .svadmin-marquee__track,
  .svadmin-marquee[data-pause='true']:focus-within .svadmin-marquee__track { animation-play-state: paused; }

  .svadmin-marquee__item {
    display: flex;
    flex: none;
    align-items: center;
    padding-inline-end: 2rem;
  }

  .svadmin-marquee[data-vertical='true'] .svadmin-marquee__item {
    padding-inline-end: 0;
    padding-block-end: 1rem;
  }

  @keyframes svadmin-marquee-scroll {
    from { transform: translate(0, 0); }
    to { transform: translate(calc(-100% / var(--svadmin-marquee-repeat, 2)), 0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .svadmin-marquee__track { animation: none; }
  }
</style>