<script lang="ts">
  import { onMount } from 'svelte';
  import { Maximize2, Minimize2 } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core';

  const i18n = useTranslation();

  export interface FullscreenButtonProps {
    target?: HTMLElement | undefined;
    title?: string;
    class?: string;
    onchange?: ((isFullscreen: boolean) => void) | undefined;
  }

  export type FullScreenButtonProps = FullscreenButtonProps;

  let {
    target,
    title,
    class: className = '',
    onchange,
  }: FullscreenButtonProps = $props();

  let isFullscreen = $state(false);

  function checkFullscreen(): boolean {
    if (typeof document === 'undefined') return false;
    return Boolean(document.fullscreenElement);
  }

  onMount(() => {
    isFullscreen = checkFullscreen();

    const handleFullscreenChange = () => {
      const active = checkFullscreen();
      isFullscreen = active;
      onchange?.(active);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  });

  async function toggleFullscreen() {
    if (typeof document === 'undefined') return;

    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } else {
        const el = target ?? document.documentElement;
        if (el && el.requestFullscreen) {
          await el.requestFullscreen();
        }
      }
    } catch {
      // Gracefully ignore permission or security restrictions in iframes
    }
  }

  const tooltipText = $derived(
    title ?? (isFullscreen ? i18n.t('common.exitFullscreen') : i18n.t('common.fullscreen'))
  );
</script>

<button
  type="button"
  class={cn(
    'inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    className
  )}
  onclick={toggleFullscreen}
  title={tooltipText}
  aria-label={tooltipText}
  aria-pressed={isFullscreen}
  data-svadmin-component="FullscreenButton"
>
  {#if isFullscreen}
    <Minimize2 class="h-4 w-4" />
  {:else}
    <Maximize2 class="h-4 w-4" />
  {/if}
</button>
