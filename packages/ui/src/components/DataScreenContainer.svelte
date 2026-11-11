<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { Maximize2, Minimize2, Monitor } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface DataScreenContainerProps {
    width?: number | undefined;
    height?: number | undefined;
    title?: string | undefined;
    subtitle?: string | undefined;
    showFullscreenButton?: boolean | undefined;
    showTechBorders?: boolean | undefined;
    class?: string | undefined;
    header?: Snippet | undefined;
    children?: Snippet | undefined;
  }

  let {
    width = 1920,
    height = 1080,
    title,
    subtitle,
    showFullscreenButton = true,
    showTechBorders = true,
    class: className = '',
    header,
    children,
  }: DataScreenContainerProps = $props();

  let outerRef = $state<HTMLElement | null>(null);
  let scale = $state(1);
  let isFullscreen = $state(false);
  let liveClock = $state('');

  function updateScale() {
    if (typeof window === 'undefined' || !outerRef) return;
    const clientW = outerRef.clientWidth || window.innerWidth;
    const clientH = outerRef.clientHeight || window.innerHeight;
    const scaleX = clientW / width;
    const scaleY = clientH / height;
    scale = Math.min(scaleX, scaleY);
  }

  function toggleFullscreen() {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      void outerRef?.requestFullscreen?.().then(() => {
        isFullscreen = true;
        updateScale();
      });
    } else {
      void document.exitFullscreen?.().then(() => {
        isFullscreen = false;
        updateScale();
      });
    }
  }

  let clockTimer: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    updateScale();
    window.addEventListener('resize', updateScale);

    const updateClock = () => {
      const d = new Date();
      liveClock = d.toTimeString().slice(0, 8);
    };
    updateClock();
    clockTimer = setInterval(updateClock, 1000);

    const handleFullscreenChange = () => {
      isFullscreen = !!document.fullscreenElement;
      updateScale();
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', updateScale);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (clockTimer) clearInterval(clockTimer);
    };
  });
</script>

<div
  bind:this={outerRef}
  data-svadmin-component="DataScreenContainer"
  data-fullscreen={isFullscreen ? 'true' : 'false'}
  class={cn(
    'relative w-full h-full min-h-[500px] overflow-hidden bg-background text-foreground flex items-center justify-center select-none',
    className,
  )}
>
  <!-- Scaled Inner Canvas -->
  <div
    class="relative flex flex-col shrink-0 transition-transform duration-100 ease-out"
    style="width: {width}px; height: {height}px; transform: scale({scale}); transform-origin: center center;"
  >
    <!-- Screen Header Bar -->
    <header class="relative z-20 flex h-16 items-center justify-between px-8 border-b border-border/80 bg-card/80 backdrop-blur-md">
      {#if header}
        {@render header()}
      {:else}
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/30">
            <Monitor class="h-5 w-5" />
          </div>
          <div>
            <h1 class="text-lg font-bold tracking-tight text-foreground">
              {title ?? '指挥中心与数据可视化大屏'}
            </h1>
            {#if subtitle}
              <p class="text-[11px] text-muted-foreground">{subtitle}</p>
            {/if}
          </div>
        </div>

        <div class="flex items-center gap-4">
          <!-- Real-time digital clock -->
          <div class="rounded-lg border border-border bg-muted/40 px-3 py-1 font-mono text-sm font-bold text-primary">
            {liveClock}
          </div>

          {#if showFullscreenButton}
            <button
              type="button"
              onclick={toggleFullscreen}
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {#if isFullscreen}
                <Minimize2 class="h-4 w-4" />
              {:else}
                <Maximize2 class="h-4 w-4" />
              {/if}
            </button>
          {/if}
        </div>
      {/if}
    </header>

    <!-- Main Big-Screen Grid Body -->
    <main class="relative z-10 flex-1 p-8 overflow-hidden">
      {#if children}
        {@render children()}
      {/if}
    </main>

    <!-- Optional Tech Luminous Accents -->
    {#if showTechBorders}
      <div class="pointer-events-none absolute inset-0 border border-primary/20 rounded-lg" aria-hidden="true">
        <div class="absolute -top-1 -left-1 h-3 w-3 border-t-2 border-l-2 border-primary"></div>
        <div class="absolute -top-1 -right-1 h-3 w-3 border-t-2 border-r-2 border-primary"></div>
        <div class="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-primary"></div>
        <div class="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-primary"></div>
      </div>
    {/if}
  </div>
</div>
