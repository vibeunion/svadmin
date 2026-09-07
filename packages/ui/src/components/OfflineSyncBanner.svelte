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
      'svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-cef5b893cf23 svadmin-u-359090c2d529 svadmin-u-eb6e8b881acd svadmin-u-0fe7d7d814d0',
      !isOnline
        ? 'svadmin-u-d9c3c520f7d5 svadmin-u-2f960aa0c478 svadmin-u-3a4ff758c2ab'
        : 'svadmin-u-b00f43c30c2b svadmin-u-c9ed8c5f79ae svadmin-u-d4108abe6359',
      className
    )}
  >
    <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4">
      <!-- Status Indicator -->
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
        {#if !isOnline}
          <div class="svadmin-u-60fbb7713999 svadmin-u-f6fe902450dc svadmin-u-7ec10f86d9b1 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-55acecc7e2f1 svadmin-u-918184635b1d">
            <WifiOff class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
          </div>
          <div>
            <div class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">Offline Mode</div>
            <div class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748">Changes are saved locally to IndexedDB queue.</div>
          </div>
        {:else}
          <div class="svadmin-u-60fbb7713999 svadmin-u-f6fe902450dc svadmin-u-7ec10f86d9b1 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-ccc86a0cef94 svadmin-u-76747e5e02ff">
            <Wifi class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
          </div>
          <div>
            <div class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">Online • Synced Connection</div>
            <div class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748">
              {pendingMutations.length} pending mutation(s) in queue
            </div>
          </div>
        {/if}
      </div>

      <!-- Actions -->
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
        {#if pendingMutations.length > 0}
          <button
            type="button"
            class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e svadmin-u-c82b67c88e69 svadmin-u-34516836730d svadmin-u-7f19cdf4c5bb svadmin-u-119b2aa0b8f6"
            onclick={() => { expanded = !expanded; }}
          >
            {expanded ? 'Hide Details' : `View Queue (${pendingMutations.length})`}
          </button>

          <Button
            size="sm"
            class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421"
            disabled={!isOnline || isSyncing}
            onclick={triggerSync}
          >
            <RefreshCw class={cn('svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29', isSyncing ? 'svadmin-u-afbdd13a380e' : '')} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        {/if}
      </div>
    </div>

    <!-- Queue List Drawer -->
    {#if expanded && pendingMutations.length > 0}
      <div class="svadmin-u-eccd13ef4f2f svadmin-u-ce335a8e4f56 svadmin-u-b950dda299d3 svadmin-u-6ee2d41e2d2d svadmin-u-5a2508227c6a svadmin-u-558f64349245 svadmin-u-92bf82f493b1">
        {#each pendingMutations as mut (mut.id)}
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-7660b450905a svadmin-u-421ac2be5045 svadmin-u-cd0ad9a56558 svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff svadmin-u-d058ca6de60f">
            <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-f283ea9bea0e">
              {#if mut.status === 'failed'}
                <AlertCircle class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-811148b13d1e svadmin-u-012fbd121f37" />
              {:else if mut.status === 'syncing'}
                <RefreshCw class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-20aaf08a7ed1 svadmin-u-afbdd13a380e svadmin-u-012fbd121f37" />
              {:else if mut.status === 'synced'}
                <CheckCircle2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-76747e5e02ff svadmin-u-012fbd121f37" />
              {:else}
                <Clock class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-bfa603190748 svadmin-u-012fbd121f37" />
              {/if}

              <Badge variant="outline" class="svadmin-u-0e65706bcccd svadmin-u-e09880869d1f uppercase svadmin-u-d8e0e382c67b svadmin-u-68ecb30dbec6">{mut.action}</Badge>
              <span class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-f283ea9bea0e">{mut.resource}</span>
              <span class="svadmin-u-bfa603190748 svadmin-u-0e65706bcccd svadmin-u-1dc571a3609f">{mut.timestamp}</span>
            </div>

            {#if mut.status === 'failed' && onretry}
              <Button
                variant="ghost"
                size="sm"
                class="svadmin-u-f6fe902450dc svadmin-u-1dc571a3609f svadmin-u-d5eab218aa34 svadmin-u-811148b13d1e svadmin-u-8db899b4e072"
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
