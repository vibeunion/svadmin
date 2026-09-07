<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';

  import { captureAdminContext } from '@svadmin/core';
  import type { AuditLog, AuthProvider } from '@svadmin/core';
  import { toast } from '@svadmin/core/toast';
  import * as Table from './ui/table/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { Loader2, ChevronLeft, ChevronRight, Search, FileSearch, Eye, X } from '@lucide/svelte';

  const i18n = useTranslation();
  const adminContext = captureAdminContext();
  const authProvider = $derived(adminContext.authProvider);

  let logs = $state<AuditLog[]>([]);
  let total = $state(0);
  let page = $state(1);
  let pageSize = 20;
  let loading = $state(true);
  let error = $state<string | null>(null);
  let searchQuery = $state('');

  // Snapshot drawer
  let drawerOpen = $state(false);
  let drawerLog = $state<AuditLog | null>(null);

  let requestId = 0;

  function closeSnapshot() {
    drawerOpen = false;
    drawerLog = null;
  }

  $effect(() => {
    void authProvider;
    void adminContext.tenantCacheKey?.__svadminTenant;
    closeSnapshot();
  });

  async function loadLogs(scopedAuthProvider: AuthProvider | null, scopedPage: number) {
    const currentId = ++requestId;
    logs = [];
    total = 0;
    loading = true;
    error = null;

    if (!scopedAuthProvider?.getAuditLogs) {
      error = i18n.t('settings.auditNotSupported') ?? 'Audit logs are not supported by the current AuthProvider';
      loading = false;
      return;
    }
    try {
      const result = await scopedAuthProvider.getAuditLogs({ page: scopedPage, pageSize });
      if (currentId !== requestId) return;
      logs = result.data;
      total = result.total;
    } catch (e) {
      if (currentId !== requestId) return;
      toast.error((e as Error).message);
    } finally {
      if (currentId === requestId) loading = false;
    }
  }

  $effect(() => {
    void adminContext.tenantCacheKey?.__svadminTenant;
    void loadLogs(authProvider, page);

    return () => {
      requestId += 1;
    };
  });

  let totalPages = $derived(Math.ceil(total / pageSize) || 1);

  let filteredLogs = $derived(
    searchQuery.trim()
      ? logs.filter(l =>
          (l.userName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (l.resource ?? '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : logs
  );

  function openSnapshot(log: AuditLog) {
    drawerLog = log;
    drawerOpen = true;
  }

  function formatDate(d: string | Date) {
    return new Date(d).toLocaleString();
  }

  function getActionColor(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    const a = action.toLowerCase();
    if (a.includes('delete') || a.includes('remove')) return 'destructive';
    if (a.includes('create') || a.includes('add')) return 'default';
    if (a.includes('update') || a.includes('edit')) return 'secondary';
    return 'outline';
  }
</script>

<div class="svadmin-u-668b21aa5409 svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed">
  <!-- Header -->
  <div class="svadmin-u-b6777c6db914">
    <h2 class="svadmin-u-d5c9b0001e7e svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
      <FileSearch class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-bfa603190748" />
      {i18n.t('settings.auditLogs') ?? 'Audit Logs'}
    </h2>
    <p class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748 svadmin-u-b6b02c0ebef6">
      {i18n.t('settings.auditDescription') ?? 'Track and review all system operations for compliance and debugging.'}
    </p>
  </div>

  {#if error}
    <div class="svadmin-u-0478c89a150f svadmin-u-ca6bcd4b6f3f svadmin-u-f0c1e65bd6f2 svadmin-u-7a0854fdbc30 svadmin-u-811148b13d1e svadmin-u-5f22e64f2282 svadmin-u-ca6bf63030aa">
      <p>{error}</p>
    </div>
  {:else}
    <!-- Search Bar -->
    <div class="svadmin-u-da019856f2cc svadmin-u-d89972fe17d6">
      <Search class="svadmin-u-da4dbfbc4fdc svadmin-u-22e59b722111 svadmin-u-d694ba66e322 svadmin-u-36b381be4df3 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748" />
      <Input
        bind:value={searchQuery}
        placeholder={i18n.t('settings.searchLogs') ?? 'Search by user, action, or resource...'}
        class="svadmin-u-9e83b2412bc9"
      />
    </div>

    <!-- Table -->
    <div class="svadmin-u-36e579c0b41c svadmin-u-438b2237b8d6 svadmin-u-3daca9af0861 svadmin-u-a10fdd7667ee svadmin-u-5f22e64f2282 svadmin-u-cd0ad9a56558 svadmin-u-2cd02d11d1af">
      {#if loading}
        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-3c8ea328c09e svadmin-u-bfa603190748">
          <Loader2 class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-afbdd13a380e svadmin-u-d2347e8497a9" />
          {i18n.t('common.loading')}
        </div>
      {:else}
        <div class="svadmin-u-73fc3fb18ceb">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head class="svadmin-u-1e3de5ebbb2f">{i18n.t('settings.auditTime') ?? 'Time'}</Table.Head>
                <Table.Head>{i18n.t('settings.auditUser') ?? 'User'}</Table.Head>
                <Table.Head>{i18n.t('settings.auditAction') ?? 'Action'}</Table.Head>
                <Table.Head>{i18n.t('settings.auditResource') ?? 'Resource'}</Table.Head>
                <Table.Head class="svadmin-u-c1ca66f139f6">{i18n.t('settings.auditIp') ?? 'IP Address'}</Table.Head>
                <Table.Head class="svadmin-u-4f98da6f3301 svadmin-u-ca6bf63030aa">{i18n.t('common.detail') ?? 'Detail'}</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each filteredLogs as log, _i (_i)}
                <Table.Row class="svadmin-u-119b2aa0b8f6 svadmin-u-83afbb7f41b3 svadmin-u-f6e31b39b8e4 svadmin-u-ceb69a6b0e5f">
                  <Table.Cell class="svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-0e65706bcccd">
                    {formatDate(log.createdAt)}
                  </Table.Cell>
                  <Table.Cell class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069">{log.userName ?? log.userId ?? '—'}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={getActionColor(log.action)}>{log.action}</Badge>
                  </Table.Cell>
                  <Table.Cell class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{log.resource ?? '—'}</Table.Cell>
                  <Table.Cell class="svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-0e65706bcccd">{log.ipAddress ?? '—'}</Table.Cell>
                  <Table.Cell class="svadmin-u-ca6bf63030aa">
                    {#if log.details}
                      <Button variant="ghost" size="icon" class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828" onclick={() => openSnapshot(log)}>
                        <Eye class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
                      </Button>
                    {/if}
                  </Table.Cell>
                </Table.Row>
              {:else}
                <Table.Row>
                  <Table.Cell colspan={6} class="svadmin-u-9678c61eaac3 svadmin-u-ca6bf63030aa svadmin-u-bfa603190748">
                    {i18n.t('common.noData')}
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </div>
      {/if}
    </div>

    <!-- Pagination -->
    <div class="svadmin-u-0ab8667228fd svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">
      <span>{total} {i18n.t('settings.auditTotal') ?? 'total records'}</span>
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
        <Button
          variant="outline" size="sm"
          disabled={page <= 1}
          onclick={() => { page--; }}
        >
          <ChevronLeft class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
        </Button>
        <span>{page} / {totalPages}</span>
        <Button
          variant="outline" size="sm"
          disabled={page >= totalPages}
          onclick={() => { page++; }}
        >
          <ChevronRight class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
        </Button>
      </div>
    </div>
  {/if}
</div>

<!-- Snapshot Drawer -->
{#if drawerOpen && drawerLog}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="svadmin-u-7bc555991dba svadmin-u-7b7df0449b80 svadmin-u-db5a366a0e21 svadmin-u-60fbb7713999 svadmin-u-77c08e015d14 svadmin-u-fd9dca32f483 svadmin-u-1ca6dd1e47c4" onclick={closeSnapshot}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="svadmin-u-cd0ad9a56558 svadmin-u-14e46609fd68 svadmin-u-6da6a3c3f741 svadmin-u-2cc8041eca99 svadmin-u-668b21aa5409 svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-40137e897961 slide-in-from-right svadmin-u-7890552ecd63" onclick={(e) => e.stopPropagation()}>
      <!-- Drawer Header -->
      <div class="svadmin-u-0478c89a150f svadmin-u-a4ba1a079087 svadmin-u-dd90176a46af svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-2859c861d7de">
        <div>
          <h2 class="svadmin-u-42536e69e639 svadmin-u-69450ef1487e svadmin-u-d4108abe6359 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
            <FileSearch class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-20aaf08a7ed1" />
            {i18n.t('settings.auditSnapshot') ?? 'Change Snapshot'}
          </h2>
          <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-b6b02c0ebef6">{formatDate(drawerLog.createdAt)} · {drawerLog.userName ?? drawerLog.userId}</p>
        </div>
        <button onclick={closeSnapshot} class="svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e svadmin-u-56bf8ae82a10 svadmin-u-7660b450905a svadmin-u-5f22e64f2282 svadmin-u-8e551981c8d7">
          <X class="svadmin-u-72470489ff4e svadmin-u-cd0d9c512cdc" />
        </button>
      </div>

      <!-- Meta Tags -->
      <div class="svadmin-u-f92d02360b8f svadmin-u-1b2d54a3fd12 svadmin-u-a4ba1a079087 svadmin-u-dd90176a46af svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-1eb5c6df38c1">
        <Badge variant="outline">{drawerLog.action}</Badge>
        {#if drawerLog.resource}
          <Badge variant="secondary">{drawerLog.resource}</Badge>
        {/if}
        {#if drawerLog.ipAddress}
          <Badge variant="outline" class="svadmin-u-0e65706bcccd svadmin-u-359090c2d529">{drawerLog.ipAddress}</Badge>
        {/if}
      </div>

      <!-- JSON Diff Viewer -->
      <div class="svadmin-u-36e579c0b41c svadmin-u-0478c89a150f svadmin-u-92bf82f493b1 svadmin-u-ba1dab71e35e svadmin-u-22a0a8a25f55">
        <pre class="svadmin-u-a2edcb1a3a6b svadmin-u-359090c2d529 svadmin-u-0e65706bcccd svadmin-u-6b189c6edadb svadmin-u-f93148569c39 svadmin-u-2859c861d7de svadmin-u-5f22e64f2282 svadmin-u-8e63407b5ceb svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af">{typeof drawerLog.details === 'object' ? JSON.stringify(drawerLog.details, null, 2) : drawerLog.details}</pre>
      </div>

      <!-- Footer -->
      <div class="svadmin-u-8e63407b5ceb svadmin-u-7b32fba79b0f svadmin-u-33787152c8e8 svadmin-u-967d113a1451 svadmin-u-308fc069e46e svadmin-u-d058ca6de60f svadmin-u-bfa603190748 svadmin-u-2689f3958069">
        System audit snapshot · Read-only
      </div>
    </div>
  </div>
{/if}
