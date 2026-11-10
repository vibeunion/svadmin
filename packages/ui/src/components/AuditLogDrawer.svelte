<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
  import { captureAdminContext, useTranslation, withValidatedAuditProvider } from '@svadmin/core';
  import type { AuditEntry, AuditLogProvider, AuditQueryParams } from '@svadmin/core';
  import * as Sheet from './ui/sheet/index.js';
  import { History, Loader2, Search, RefreshCw } from '@lucide/svelte';
  import AuditTimeline, { type TimelineItem, type AuditFieldChange } from './content/AuditTimeline.svelte';

  export type AuditLogDrawerLoader = (params: AuditQueryParams) => Promise<AuditEntry[]>;

  const i18n = useTranslation();
  const adminContext = captureAdminContext();

  let {
    open = $bindable(false),
    resource,
    recordId,
    loadEntries,
    title,
    description,
  }: {
    open: boolean;
    resource: string;
    recordId?: string | number | undefined;
    /** Optional loader; defaults to the AdminContext auditLogProvider. */
    loadEntries?: AuditLogDrawerLoader | undefined;
    title?: string | undefined;
    description?: string | undefined;
  } = $props();

  let logs = $state<AuditEntry[]>([]);
  let isLoading = $state(false);
  let loadFailed = $state(false);
  let requestEpoch = 0;

  // 过滤状态
  let actionFilter = $state<string>('all');
  let searchQuery = $state<string>('');

  const resolvedTitle = $derived(title ?? i18n.t('common.history') ?? 'Audit Logs');
  const resolvedDesc = $derived(description ?? `Audit log and revision history for ${resource}${recordId ? ` #${recordId}` : ''}.`);

  // 从 previousData 与 data 计算字段变更
  function computeChanges(prev?: Record<string, unknown>, curr?: Record<string, unknown>): AuditFieldChange[] {
    if (!prev && !curr) return [];
    const keys = new Set([...Object.keys(prev || {}), ...Object.keys(curr || {})]);
    const diffs: AuditFieldChange[] = [];

    for (const key of keys) {
      if (key === 'id' || key === 'updatedAt' || key === 'updated_at') continue;
      const oldVal = prev ? prev[key] : undefined;
      const newVal = curr ? curr[key] : undefined;
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diffs.push({
          field: key,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }
    return diffs;
  }

  // 将 AuditEntry[] 转换为 TimelineItem[]
  const timelineItems = $derived.by<TimelineItem[]>(() => {
    return logs
      .filter((entry) => {
        // 操作动作过滤
        if (actionFilter !== 'all' && entry.action.toLowerCase() !== actionFilter.toLowerCase()) {
          return false;
        }
        // 搜索关键词过滤
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchUser = entry.userId?.toLowerCase().includes(q);
          const matchAction = entry.action.toLowerCase().includes(q);
          const matchResource = entry.resource?.toLowerCase().includes(q);
          const matchData = JSON.stringify(entry.data || {}).toLowerCase().includes(q);
          if (!matchUser && !matchAction && !matchResource && !matchData) return false;
        }
        return true;
      })
      .map((entry) => {
        const changes = computeChanges(entry.previousData, entry.data);
        const metaValue = entry.meta?.['ip'];
        const metaIp = typeof metaValue === 'string' ? metaValue : undefined;
        const ip = entry.ipAddress || metaIp;
        return {
          id: String(entry.id ?? Math.random()),
          title: `${entry.action.toUpperCase()} ${entry.resource ?? resource}`,
          action: entry.action,
          timestamp: entry.timestamp,
          actor: {
            id: entry.userId,
            name: entry.userId,
            ip,
          },
          changes: changes.length > 0 ? changes : undefined,
          meta: entry.meta,
        };
      });
  });

  $effect(() => {
    const scopedProvider = adminContext.auditLogProvider;
    const scopedLoader = loadEntries;
    const scopedResource = resource;
    const scopedRecordId = recordId;
    const shouldLoad = open;
    const providerMeta = adminContext.getProviderMeta(
      scopedResource,
      scopedRecordId == null ? undefined : { recordId: scopedRecordId },
    );

    clearAuditScope();
    if (shouldLoad) {
      if (scopedLoader) {
        void loadAuditLogsWithLoader(scopedLoader, definedOptions({ resource: scopedResource, meta: providerMeta }));
      } else if (scopedProvider) {
        void loadAuditLogs(scopedProvider, scopedResource, scopedRecordId, providerMeta);
      }
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
    scopedRecordId: string | number | undefined,
    providerMeta: Record<string, unknown> | undefined,
  ) {
    return loadAuditLogsWithLoader(
      (params) => withValidatedAuditProvider(scopedProvider).get(params),
      definedOptions({ resource: scopedResource, meta: providerMeta }),
      false,
    );
  }

  async function loadAuditLogsWithLoader(
    loader: AuditLogDrawerLoader,
    params: AuditQueryParams,
    validateResponse = true,
  ) {
    const epoch = requestEpoch;
    isLoading = true;
    try {
      const entries = validateResponse
        ? await withValidatedAuditProvider({
            create: async (createParams) => createParams,
            get: loader,
          }).get(params)
        : await loader(params);
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

  function refresh() {
    const scopedProvider = adminContext.auditLogProvider;
    const scopedLoader = loadEntries;
    const scopedResource = resource;
    const scopedRecordId = recordId;
    const providerMeta = adminContext.getProviderMeta(
      scopedResource,
      scopedRecordId == null ? undefined : { recordId: scopedRecordId },
    );
    if (scopedLoader) {
      void loadAuditLogsWithLoader(scopedLoader, definedOptions({ resource: scopedResource, meta: providerMeta }));
    } else if (scopedProvider) {
      void loadAuditLogs(scopedProvider, scopedResource, scopedRecordId, providerMeta);
    }
  }
</script>

<Sheet.Root bind:open>
  <Sheet.Content class="w-full sm:max-w-lg overflow-y-auto" data-svadmin-component="AuditLogDrawer">
    <Sheet.Header>
      <div class="flex items-center justify-between pr-6">
        <Sheet.Title class="flex items-center gap-2 text-base font-semibold">
          <History class="h-5 w-5 text-primary" />
          <span>{resolvedTitle}</span>
        </Sheet.Title>
        <button
          type="button"
          class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
          onclick={refresh}
          disabled={isLoading}
          title="Refresh"
          aria-label="Refresh audit logs"
        >
          <RefreshCw class="h-4 w-4 {isLoading ? 'animate-spin' : ''}" />
        </button>
      </div>
      <Sheet.Description class="text-xs text-muted-foreground">
        {resolvedDesc}
      </Sheet.Description>
    </Sheet.Header>

    <!-- Filter & Search Toolbar -->
    <div class="mt-4 flex items-center gap-2 border-b pb-3">
      <div class="relative flex-1">
        <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter by user or action..."
          class="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          bind:value={searchQuery}
          oninput={(e) => { searchQuery = e.currentTarget.value; }}
          data-svadmin-field="audit-search"
        />
      </div>

      <div class="relative w-32">
        <select
          class="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary capitalize"
          bind:value={actionFilter}
          onchange={(e) => { actionFilter = e.currentTarget.value; }}
          data-svadmin-field="audit-action-filter"
        >
          <option value="all">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="approve">Approve</option>
          <option value="rollback">Rollback</option>
        </select>
      </div>
    </div>

    <!-- Content Area -->
    <div class="mt-6">
      {#if isLoading}
        <div class="flex justify-center py-12 text-muted-foreground">
          <Loader2 class="h-6 w-6 animate-spin text-primary" />
        </div>
      {:else if loadFailed}
        <div class="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center text-xs text-destructive" role="alert">
          {i18n.t('common.error') ?? 'Failed to load audit logs'}
        </div>
      {:else if timelineItems.length === 0}
        <div class="text-center py-12">
          <History class="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p class="text-xs text-muted-foreground">
            {searchQuery || actionFilter !== 'all' ? 'No matching audit records' : (i18n.t('common.noData') ?? 'No audit logs found')}
          </p>
        </div>
      {:else}
        <AuditTimeline items={timelineItems} />
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>
