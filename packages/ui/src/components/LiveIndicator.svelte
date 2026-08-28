<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Wifi, WifiOff, Loader2 } from '@lucide/svelte';
  import { Badge } from './ui/badge/index.js';

  let {
    status = 'disconnected',
    resource = '',
    lastEvent = null,
    showDetails = false,
  } = $props<{
    status: 'connecting' | 'connected' | 'disconnected';
    resource?: string;
    lastEvent?: { type: string; timestamp?: number } | null;
    showDetails?: boolean;
  }>();

  const statusConfigs = {
    connected: { variant: 'default' as const, dotClass: 'bg-success', label: 'Live', icon: Wifi },
    connecting: { variant: 'secondary' as const, dotClass: 'bg-warning', label: 'Connecting...', icon: Loader2 as typeof Wifi },
    disconnected: { variant: 'destructive' as const, dotClass: 'bg-destructive', label: 'Offline', icon: WifiOff },
  } as const;
  type StatusKey = 'connected' | 'connecting' | 'disconnected';
  const cfg = $derived(statusConfigs[status as StatusKey]);

  let now = $state(Date.now());
  $effect(() => {
    const itv = setInterval(() => { now = Date.now(); }, 1000);
    return () => clearInterval(itv);
  });

  const timeSinceEvent = $derived(
    lastEvent?.timestamp
      ? Math.floor((now - lastEvent.timestamp) / 1000)
      : null
  );
</script>

{#key status}
  <div transition:fade={{ duration: 200 }}>
    <Badge
      variant={cfg.variant}
      class="gap-1.5 select-none"
      title={cfg.label}
      role="status"
      aria-label={`Connection status: ${cfg.label}${resource ? ` for ${resource}` : ''}`}
    >
      <span class="relative flex h-2 w-2" aria-hidden="true">
        <span class="{cfg.dotClass} rounded-full h-2 w-2"></span>
        {#if status === 'connected'}
          <span class="absolute inset-0 rounded-full {cfg.dotClass} opacity-40 animate-ping motion-reduce:animate-none"></span>
        {/if}
      </span>
      <span class="text-[0.6875rem] font-semibold uppercase tracking-wide">{cfg.label}</span>

      {#if showDetails && resource}
        <span class="text-[0.625rem] font-mono opacity-70">{resource}</span>
      {/if}

      {#if showDetails && lastEvent}
        <span class="text-[0.625rem] opacity-70">
          {lastEvent.type}
          {#if timeSinceEvent !== null && timeSinceEvent < 60}
            <span class="opacity-60 tabular-nums">{timeSinceEvent}s ago</span>
          {/if}
        </span>
      {/if}
    </Badge>
  </div>
{/key}
