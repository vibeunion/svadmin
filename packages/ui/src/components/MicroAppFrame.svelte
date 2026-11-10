<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    Maximize2,
    Minimize2,
    RotateCw,
    ExternalLink,
    AlertCircle,
    Loader2,
    Layers,
  } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import { cn } from '../utils.js';

  export interface MicroAppMessage<T = unknown> {
    type: 'svadmin:init' | 'svadmin:ready' | 'svadmin:resize' | 'svadmin:navigate' | 'svadmin:custom';
    payload?: T;
  }

  export interface MicroAppFrameProps {
    /** Target URL to load inside the frame */
    src: string;
    /** Human-readable title displayed in the frame header */
    title?: string;
    /** Allowed origin whitelist for secure postMessage communication */
    allowedOrigins?: string[];
    /** Height in pixels or CSS string (e.g. '600px', '100%'). Defaults to '650px' unless auto-resizing */
    height?: string | number;
    /** Allow sub-app to dynamically report its height via postMessage. Defaults to true */
    autoResize?: boolean;
    /** Current UI color mode ('light' or 'dark') forwarded to the sub-app. */
    theme?: 'light' | 'dark' | 'auto';
    /** Current locale forwarded to the sub-app. */
    locale?: string;
    /** Show header bar with title, reload, external open and fullscreen toggle. Defaults to true */
    showHeader?: boolean;
    /** Optional auth token forwarded via secure postMessage upon handshake */
    token?: string;
    /** Iframe sandbox permissions string. Defaults to 'allow-scripts allow-same-origin allow-forms allow-popups' */
    sandbox?: string;
    /** Timeout in milliseconds before displaying loading error fallback. Defaults to 15000 */
    timeoutMs?: number;
    /** Custom class for outer wrapper */
    class?: string;
    onready?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: MicroAppMessage) => void;
  }

  let {
    src,
    title = 'Embedded Micro App',
    allowedOrigins = ['*'],
    height = '650px',
    autoResize = true,
    theme = 'auto',
    locale = 'zh-CN',
    showHeader = true,
    token,
    sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups',
    timeoutMs = 15000,
    class: className,
    onready,
    onerror,
    onmessage,
  }: MicroAppFrameProps = $props();

  let iframeEl = $state<HTMLIFrameElement | null>(null);
  let isFullscreen = $state(false);
  let isLoading = $state(true);
  let hasError = $state(false);
  let reportedHeight = $state<number | null>(null);
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  const effectiveHeight = $derived.by(() => {
    if (isFullscreen) return '100vh';
    if (autoResize && reportedHeight != null && reportedHeight > 0) {
      return `${reportedHeight}px`;
    }
    return typeof height === 'number' ? `${height}px` : height;
  });

  function startTimeout() {
    clearTimeoutTimer();
    if (timeoutMs > 0) {
      timeoutTimer = setTimeout(() => {
        if (isLoading) {
          isLoading = false;
          hasError = true;
          onerror?.(new Error(`Micro app load timed out after ${timeoutMs}ms: ${src}`));
        }
      }, timeoutMs);
    }
  }

  function clearTimeoutTimer() {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
  }

  function sendHandshake() {
    if (!iframeEl || !iframeEl.contentWindow) return;
    const targetOrigin = allowedOrigins.includes('*') ? '*' : allowedOrigins[0] || '*';
    const initMessage: MicroAppMessage = {
      type: 'svadmin:init',
      payload: {
        theme,
        locale,
        token,
        timestamp: Date.now(),
      },
    };
    iframeEl.contentWindow.postMessage(initMessage, targetOrigin);
  }

  function handleIframeLoad() {
    clearTimeoutTimer();
    isLoading = false;
    hasError = false;
    sendHandshake();
    onready?.();
  }

  function handleReload() {
    isLoading = true;
    hasError = false;
    startTimeout();
    if (iframeEl) {
      iframeEl.src = src;
    }
  }

  function handleWindowMessage(event: MessageEvent) {
    if (!allowedOrigins.includes('*') && !allowedOrigins.includes(event.origin)) {
      return;
    }

    const data = event.data as MicroAppMessage | undefined;
    if (!data || typeof data !== 'object' || !data.type) return;

    if (data.type === 'svadmin:ready') {
      isLoading = false;
      hasError = false;
      sendHandshake();
      onready?.();
    } else if (data.type === 'svadmin:resize') {
      const h = Number((data.payload as { height?: number })?.height);
      if (!isNaN(h) && h > 0) {
        reportedHeight = h;
      }
    }

    onmessage?.(data);
  }

  onMount(() => {
    startTimeout();
    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleWindowMessage);
    }
  });

  onDestroy(() => {
    clearTimeoutTimer();
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', handleWindowMessage);
    }
  });
</script>

<div
  class={cn(
    'relative flex flex-col rounded-lg border border-border bg-card overflow-hidden transition-all duration-200',
    isFullscreen && 'fixed inset-0 z-50 rounded-none border-0 h-screen w-screen',
    className,
  )}
  data-svadmin-component="micro-app-frame"
  data-svadmin-fullscreen={isFullscreen ? 'true' : 'false'}
>
  <!-- Frame Header -->
  {#if showHeader}
    <div class="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center justify-between gap-3 text-xs select-none">
      <div class="flex items-center gap-2 min-w-0">
        <Layers class="h-4 w-4 text-primary shrink-0" />
        <span class="font-semibold text-foreground truncate">{title}</span>
        <span class="text-[11px] font-mono text-muted-foreground/80 truncate hidden sm:inline" title={src}>
          ({src})
        </span>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 text-muted-foreground hover:text-foreground"
          onclick={handleReload}
          title="Reload frame"
          aria-label="Reload frame"
          data-svadmin-action="reload-frame"
        >
          <RotateCw class="h-3.5 w-3.5" />
        </Button>

        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          class="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Open in new window"
          aria-label="Open in new window"
          data-svadmin-action="external-open"
        >
          <ExternalLink class="h-3.5 w-3.5" />
        </a>

        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 text-muted-foreground hover:text-foreground"
          onclick={() => (isFullscreen = !isFullscreen)}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          data-svadmin-action="toggle-fullscreen"
        >
          {#if isFullscreen}
            <Minimize2 class="h-3.5 w-3.5" />
          {:else}
            <Maximize2 class="h-3.5 w-3.5" />
          {/if}
        </Button>
      </div>
    </div>
  {/if}

  <!-- Frame Body -->
  <div class="relative w-full flex-1 bg-background" style="height: {effectiveHeight};">
    <!-- Loading Overlay -->
    {#if isLoading}
      <div
        class="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-[1px] z-10 transition-opacity"
        role="status"
        aria-live="polite"
        data-svadmin-frame-loading="true"
      >
        <Loader2 class="h-7 w-7 animate-spin text-primary mb-2" />
        <span class="text-xs text-muted-foreground font-medium">Connecting micro application...</span>
      </div>
    {/if}

    <!-- Error Fallback -->
    {#if hasError}
      <div
        class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-background z-20"
        role="alert"
        data-svadmin-frame-error="true"
      >
        <div class="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-3">
          <AlertCircle class="h-5 w-5" />
        </div>
        <h3 class="text-sm font-semibold text-foreground">Failed to load embedded application</h3>
        <p class="text-xs text-muted-foreground mt-1 max-w-sm">
          The application at <span class="font-mono text-foreground break-all">{src}</span> took too long to respond or restricted cross-origin framing.
        </p>
        <Button
          variant="outline"
          size="sm"
          class="mt-4 text-xs"
          onclick={handleReload}
          data-svadmin-action="retry-frame"
        >
          <RotateCw class="h-3.5 w-3.5 mr-1" />
          Retry Connection
        </Button>
      </div>
    {/if}

    <!-- Target Iframe -->
    <iframe
      bind:this={iframeEl}
      {src}
      {sandbox}
      title={title}
      class="w-full h-full border-0 block"
      onload={handleIframeLoad}
      data-svadmin-frame="true"
    ></iframe>
  </div>
</div>
