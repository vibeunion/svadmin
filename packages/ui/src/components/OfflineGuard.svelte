<script lang="ts">
  import type { Snippet } from 'svelte';
  import { WifiOff } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { useNetworkStatus } from './useNetworkStatus.svelte.js';

  export interface OfflineGuardProps {
    /** Controlled online state */
    online?: boolean;
    /** Guard protection mode: 'disable' reduces opacity and blocks pointer events; 'overlay' renders a translucent card overlay. Defaults to 'disable'. */
    mode?: 'disable' | 'overlay';
    /** Custom offline alert message displayed when blocked */
    message?: string;
    children?: Snippet;
    fallback?: Snippet;
    class?: string;
  }

  let {
    online: controlledOnline,
    mode = 'disable',
    message = 'Actions temporarily restricted while offline to prevent data loss',
    children,
    fallback,
    class: className,
  }: OfflineGuardProps = $props();

  const netStatus = useNetworkStatus();
  const effectiveOnline = $derived(controlledOnline !== undefined ? controlledOnline : netStatus.isOnline);
</script>

<div
  class={cn('relative transition-all', className)}
  data-svadmin-component="offline-guard"
  data-svadmin-offline={!effectiveOnline ? 'true' : 'false'}
>
  {#if !effectiveOnline && fallback}
    {@render fallback()}
  {:else}
    <div
      class={cn(
        'transition-all',
        !effectiveOnline && mode === 'disable' && 'pointer-events-none opacity-60 select-none cursor-not-allowed',
      )}
    >
      {#if children}
        {@render children()}
      {/if}
    </div>

    {#if !effectiveOnline && mode === 'overlay'}
      <div
        class="absolute inset-0 bg-background/80 backdrop-blur-[1px] rounded-lg border border-border flex flex-col items-center justify-center p-4 text-center z-10 animate-in fade-in duration-200"
        role="alert"
        data-svadmin-guard-overlay="true"
      >
        <div class="h-9 w-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
          <WifiOff class="h-4 w-4" />
        </div>
        <p class="text-xs font-medium text-foreground">{message}</p>
        <p class="text-[11px] text-muted-foreground mt-0.5">Please check your internet connection to continue.</p>
      </div>
    {/if}
  {/if}
</div>
