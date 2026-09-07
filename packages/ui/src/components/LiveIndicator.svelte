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
    connected: { variant: 'default' as const, dotClass: 'svadmin-u-3355648fe22b', label: 'Live', icon: Wifi },
    connecting: { variant: 'secondary' as const, dotClass: 'svadmin-u-a486cacb3a15', label: 'Connecting...', icon: Loader2 as typeof Wifi },
    disconnected: { variant: 'destructive' as const, dotClass: 'svadmin-u-fb1b0d05046d', label: 'Offline', icon: WifiOff },
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
      class="svadmin-u-58284b4ea568 svadmin-u-7f6912283f11"
      title={cfg.label}
      role="status"
      aria-label={`Connection status: ${cfg.label}${resource ? ` for ${resource}` : ''}`}
    >
      <span class="svadmin-u-d89972fe17d6 svadmin-u-60fbb7713999 svadmin-u-2f2a842e50fa svadmin-u-940924b6e2d9" aria-hidden="true">
        <span class="{cfg.dotClass} svadmin-u-ac204c108886 svadmin-u-2f2a842e50fa svadmin-u-940924b6e2d9"></span>
        {#if status === 'connected'}
          <span class="svadmin-u-da4dbfbc4fdc svadmin-u-7b7df0449b80 svadmin-u-ac204c108886 {cfg.dotClass} svadmin-u-2a2db4667b27 svadmin-u-e9963c2ac628 svadmin-u-259ce51fc8f3"></span>
        {/if}
      </span>
      <span class="svadmin-u-76067d04e222 svadmin-u-e83a7042bc91 uppercase svadmin-u-8baf13a3e9d7">{cfg.label}</span>

      {#if showDetails && resource}
        <span class="svadmin-u-06b1d9433e62 svadmin-u-0e65706bcccd svadmin-u-0c67ca474a69">{resource}</span>
      {/if}

      {#if showDetails && lastEvent}
        <span class="svadmin-u-06b1d9433e62 svadmin-u-0c67ca474a69">
          {lastEvent.type}
          {#if timeSinceEvent !== null && timeSinceEvent < 60}
            <span class="svadmin-u-f2868c227fcd svadmin-u-3032cae0badb">{timeSinceEvent}s ago</span>
          {/if}
        </span>
      {/if}
    </Badge>
  </div>
{/key}
