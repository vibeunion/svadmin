<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from './ui/button/index.js';
  import { Badge } from './ui/badge/index.js';
  import {
    Wifi,
    WifiOff,
    RefreshCw,
    CheckCircle2,
    Clock,
    AlertCircle,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface PendingMutation {
    id: string;
    action: string; // e.g. "update", "create", "delete"
    resource: string;
    timestamp: string;
    status?: 'pending' | 'syncing' | 'failed' | 'synced';
    error?: string;
  }

  interface Props {
    isOnline?: boolean;
    pendingMutations?: PendingMutation[];
    autoSync?: boolean;
    onsync?: (mutations: PendingMutation[]) => void | Promise<void>;
    onretry?: (mutationId: string) => void;
    class?: string;
  }

  let {
    isOnline = $bindable(true),
    pendingMutations = $bindable([]),
    autoSync = true,
    onsync,
    onretry,
    class: className = '',
  }: Props = $props();

  let isSyncing = $state(false);
  let expanded = $state(false);

  async function triggerSync() {
    if (isSyncing || pendingMutations.length === 0) return;
    isSyncing = true;
    try {
      await onsync?.(pendingMutations);
    } finally {
      isSyncing = false;
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      const handleOnline = () => {
        isOnline = true;
        if (autoSync && pendingMutations.length > 0) {
          triggerSync();
        }
      };
      const handleOffline = () => {
        isOnline = false;
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  });
</script>

{#if !isOnline || pendingMutations.length > 0}
  <div
    class={cn(
      'rounded-xl border shadow-xs text-xs p-3 transition-all',
      !isOnline
        ? 'bg-warning/15 border-warning/30 text-warning-foreground'
        : 'bg-muted/40 border-border/80 text-foreground',
      className
    )}
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <!-- Status Indicator -->
      <div class="flex items-center gap-2">
        {#if !isOnline}
          <div class="flex h-6 w-6 items-center justify-center rounded-full bg-warning/20 text-warning">
            <WifiOff class="h-3.5 w-3.5" />
          </div>
          <div>
            <div class="font-semibold text-foreground">Offline Mode</div>
            <div class="text-[11px] text-muted-foreground">Changes are saved locally to IndexedDB queue.</div>
          </div>
        {:else}
          <div class="flex h-6 w-6 items-center justify-center rounded-full bg-success/20 text-success">
            <Wifi class="h-3.5 w-3.5" />
          </div>
          <div>
            <div class="font-semibold text-foreground">Online • Synced Connection</div>
            <div class="text-[11px] text-muted-foreground">
              {pendingMutations.length} pending mutation(s) in queue
            </div>
          </div>
        {/if}
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        {#if pendingMutations.length > 0}
          <button
            type="button"
            class="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer bg-transparent border-0"
            onclick={() => { expanded = !expanded; }}
          >
            {expanded ? 'Hide Details' : `View Queue (${pendingMutations.length})`}
          </button>

          <Button
            size="sm"
            class="h-7 text-xs gap-1"
            disabled={!isOnline || isSyncing}
            onclick={triggerSync}
          >
            <RefreshCw class={cn('h-3 w-3', isSyncing ? 'animate-spin' : '')} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        {/if}
      </div>
    </div>

    <!-- Queue List Drawer -->
    {#if expanded && pendingMutations.length > 0}
      <div class="mt-3 pt-3 border-t border-border/40 space-y-1.5 max-h-48 overflow-y-auto">
        {#each pendingMutations as mut (mut.id)}
          <div class="flex items-center justify-between p-2 rounded-md bg-card border border-border/60 text-[11px]">
            <div class="flex items-center gap-2 truncate">
              {#if mut.status === 'failed'}
                <AlertCircle class="h-3.5 w-3.5 text-destructive shrink-0" />
              {:else if mut.status === 'syncing'}
                <RefreshCw class="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
              {:else if mut.status === 'synced'}
                <CheckCircle2 class="h-3.5 w-3.5 text-success shrink-0" />
              {:else}
                <Clock class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {/if}

              <Badge variant="outline" class="font-mono text-[9px] uppercase px-1 py-0">{mut.action}</Badge>
              <span class="font-medium text-foreground truncate">{mut.resource}</span>
              <span class="text-muted-foreground font-mono text-[10px]">{mut.timestamp}</span>
            </div>

            {#if mut.status === 'failed' && onretry}
              <Button
                variant="ghost"
                size="sm"
                class="h-6 text-[10px] px-2 text-destructive hover:bg-destructive/10"
                onclick={() => onretry?.(mut.id)}
              >
                Retry
              </Button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
