<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

  import { captureAdminContext, useTranslation, withValidatedAuditProvider } from '@svadmin/core';

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
  let loadFailed = $state(false);
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
    loadFailed = false;
  }

  async function loadAuditLogs(
    scopedProvider: AuditLogProvider,
    scopedResource: string,
    providerMeta: Record<string, unknown> | undefined,
  ) {
    const epoch = requestEpoch;
    isLoading = true;
    try {
      const entries = await withValidatedAuditProvider(scopedProvider).get(
        definedOptions({ resource: scopedResource, meta: providerMeta }),
      );
      if (epoch === requestEpoch) logs = entries;
    } catch (error) {
      if (epoch === requestEpoch) {
        loadFailed = true;
        console.error('[svadmin] Failed to fetch audit logs', error);
      }
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
  <Sheet.Content class="svadmin-u-6da6a3c3f741 svadmin-u-c0bedbbc0c34 svadmin-u-92bf82f493b1">
    <Sheet.Header>
      <Sheet.Title class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
        <History class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e" />
        {i18n.t('common.history') || 'History'}
      </Sheet.Title>
      <Sheet.Description>
        Audit log and revision history for this record.
      </Sheet.Description>
    </Sheet.Header>

    <div class="svadmin-u-4e5d2af5fc1f svadmin-u-3e7ce58d64fa">
      {#if isLoading}
        <div class="svadmin-u-60fbb7713999 svadmin-u-86843cf1e227 svadmin-u-a1f611f027dd svadmin-u-bfa603190748">
          <Loader2 class="svadmin-u-f6fe902450dc svadmin-u-7ec10f86d9b1 svadmin-u-afbdd13a380e" />
        </div>
      {:else if loadFailed}
        <p role="alert">{i18n.t('common.error')}</p>
      {:else if logs.length === 0}
        <div class="svadmin-u-ca6bf63030aa svadmin-u-1100bef66e60">
          <History class="svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-0e12dc7de920 svadmin-u-106b502aac96 svadmin-u-1bb883263ed2" />
          <p class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">
            {i18n.t('common.noData') || 'No audit logs found'}
          </p>
        </div>
      {:else}
        <div class="svadmin-u-d89972fe17d6 svadmin-u-d4f78465b34d svadmin-u-18049387f0af svadmin-u-fd9bb0dd33ac svadmin-u-9079b62ef1cb svadmin-u-793f9e26e29b">
          {#each logs as log, _i (_i)}
            <div class="svadmin-u-d89972fe17d6">
              <span class="svadmin-u-da4dbfbc4fdc svadmin-u-ea875e48d525 svadmin-u-c55dcda26eec svadmin-u-60fbb7713999 svadmin-u-2f2a842e50fa svadmin-u-940924b6e2d9 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-44559afbdbd7 svadmin-u-85399de17097 {getActionColor(log.action)}"></span>
              <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-58284b4ea568">
                <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-8ef2268efbbc">
                  <span class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 capitalize">{log.action}</span>
                  <span class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                {#if log.userId}
                  <span class="svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-0e65706bcccd svadmin-u-2ef11f1cb219 svadmin-u-52083e7da442 svadmin-u-45d828117213 svadmin-u-465609a240a8 svadmin-u-07389a777c1f svadmin-u-92e7450ad20d">
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
