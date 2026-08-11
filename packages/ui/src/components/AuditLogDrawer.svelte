<script lang="ts">
  import { captureAdminContext, useTranslation } from '@svadmin/core';

  import type { AuditEntry, AuditLogProvider } from '@svadmin/core';
  import * as Sheet from './ui/sheet/index.js';
  import { History, Loader2 } from '@lucide/svelte';

  const i18n = useTranslation();
  const adminContext = captureAdminContext();

  let { open = $bindable(false), resource, recordId } = $props<{
    open: boolean;
    resource: string;
    recordId?: string | number;
  }>();

  let logs = $state<AuditEntry[]>([]);
  let isLoading = $state(false);
  let requestEpoch = 0;

  $effect(() => {
    const scopedProvider = adminContext.auditLogProvider;
    const scopedResource = resource;
    const scopedRecordId = recordId;
    const shouldLoad = open;
    const providerMeta = adminContext.getProviderMeta(
      scopedResource,
      scopedRecordId == null ? undefined : { recordId: scopedRecordId },
    );

    clearAuditScope();
    if (shouldLoad && scopedProvider) {
      void loadAuditLogs(scopedProvider, scopedResource, providerMeta);
    }

    return cancelAuditRequest;
  });

  function cancelAuditRequest() {
    requestEpoch += 1;
  }

  function clearAuditScope() {
    cancelAuditRequest();
    logs = [];
    isLoading = false;
  }

  async function loadAuditLogs(
    scopedProvider: AuditLogProvider,
    scopedResource: string,
    providerMeta: Record<string, unknown> | undefined,
  ) {
    const epoch = requestEpoch;
    isLoading = true;
    try {
      const entries = await scopedProvider.get({ resource: scopedResource, meta: providerMeta });
      if (epoch === requestEpoch) logs = entries;
    } catch (error) {
      if (epoch === requestEpoch) console.error('[svadmin] Failed to fetch audit logs', error);
    } finally {
      if (epoch === requestEpoch) isLoading = false;
    }
  }

  // Action semantic color mapping
  function getActionColor(action: string) {
    switch (action) {
      case 'create': return 'bg-success';
      case 'update': return 'bg-info';
      case 'delete': return 'bg-destructive';
      default: return 'bg-muted-foreground';
    }
  }
</script>

<Sheet.Root bind:open>
  <Sheet.Content class="w-full sm:max-w-md overflow-y-auto">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        <History class="h-5 w-5" />
        {i18n.t('common.history') || 'History'}
      </Sheet.Title>
      <Sheet.Description>
        Audit log and revision history for this record.
      </Sheet.Description>
    </Sheet.Header>

    <div class="mt-8 space-y-4">
      {#if isLoading}
        <div class="flex justify-center py-8 text-muted-foreground">
          <Loader2 class="h-6 w-6 animate-spin" />
        </div>
      {:else if logs.length === 0}
        <div class="text-center py-10">
          <History class="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p class="text-sm text-muted-foreground">
            {i18n.t('common.noData') || 'No audit logs found'}
          </p>
        </div>
      {:else}
        <div class="relative border-l border-border ml-3 pl-6 space-y-8">
          {#each logs as log, _i (_i)}
            <div class="relative">
              <span class="absolute -left-7 top-1 flex h-2 w-2 items-center justify-center rounded-full ring-4 ring-background {getActionColor(log.action)}"></span>
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center gap-2 justify-between">
                  <span class="text-sm font-semibold capitalize">{log.action}</span>
                  <span class="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                {#if log.userId}
                  <span class="text-xs text-muted-foreground font-mono bg-muted inline-flex px-1.5 py-0.5 rounded w-fit">
                    User: {log.userId}
                  </span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>
