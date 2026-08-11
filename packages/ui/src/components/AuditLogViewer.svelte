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
    authProvider;
    adminContext.tenantCacheKey?.__svadminTenant;
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
    adminContext.tenantCacheKey?.__svadminTenant;
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

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="mb-6">
    <h2 class="text-xl font-semibold text-foreground flex items-center gap-2">
      <FileSearch class="h-5 w-5 text-muted-foreground" />
      {i18n.t('settings.auditLogs') ?? 'Audit Logs'}
    </h2>
    <p class="text-sm text-muted-foreground mt-1">
      {i18n.t('settings.auditDescription') ?? 'Track and review all system operations for compliance and debugging.'}
    </p>
  </div>

  {#if error}
    <div class="p-6 border border-destructive/20 bg-destructive/5 text-destructive rounded-lg text-center">
      <p>{error}</p>
    </div>
  {:else}
    <!-- Search Bar -->
    <div class="mb-4 relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        bind:value={searchQuery}
        placeholder={i18n.t('settings.searchLogs') ?? 'Search by user, action, or resource...'}
        class="pl-9"
      />
    </div>

    <!-- Table -->
    <div class="flex-1 shadow-sm ring-1 ring-border/10 rounded-lg bg-card overflow-hidden">
      {#if loading}
        <div class="flex items-center justify-center h-48 text-muted-foreground">
          <Loader2 class="h-5 w-5 animate-spin mr-2" />
          {i18n.t('common.loading')}
        </div>
      {:else}
        <div class="overflow-auto">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head class="w-[160px]">{i18n.t('settings.auditTime') ?? 'Time'}</Table.Head>
                <Table.Head>{i18n.t('settings.auditUser') ?? 'User'}</Table.Head>
                <Table.Head>{i18n.t('settings.auditAction') ?? 'Action'}</Table.Head>
                <Table.Head>{i18n.t('settings.auditResource') ?? 'Resource'}</Table.Head>
                <Table.Head class="w-[120px]">{i18n.t('settings.auditIp') ?? 'IP Address'}</Table.Head>
                <Table.Head class="w-[60px] text-center">{i18n.t('common.detail') ?? 'Detail'}</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each filteredLogs as log, _i (_i)}
                <Table.Row class="border-0 even:bg-muted/20 hover:bg-muted/40 transition-colors">
                  <Table.Cell class="text-xs text-muted-foreground font-mono">
                    {formatDate(log.createdAt)}
                  </Table.Cell>
                  <Table.Cell class="text-sm font-medium">{log.userName ?? log.userId ?? '—'}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={getActionColor(log.action)}>{log.action}</Badge>
                  </Table.Cell>
                  <Table.Cell class="text-sm text-muted-foreground">{log.resource ?? '—'}</Table.Cell>
                  <Table.Cell class="text-xs text-muted-foreground font-mono">{log.ipAddress ?? '—'}</Table.Cell>
                  <Table.Cell class="text-center">
                    {#if log.details}
                      <Button variant="ghost" size="icon" class="h-7 w-7" onclick={() => openSnapshot(log)}>
                        <Eye class="h-3.5 w-3.5" />
                      </Button>
                    {/if}
                  </Table.Cell>
                </Table.Row>
              {:else}
                <Table.Row>
                  <Table.Cell colspan={6} class="h-24 text-center text-muted-foreground">
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
    <div class="mt-4 flex items-center justify-between text-sm text-muted-foreground">
      <span>{total} {i18n.t('settings.auditTotal') ?? 'total records'}</span>
      <div class="flex items-center gap-2">
        <Button
          variant="outline" size="sm"
          disabled={page <= 1}
          onclick={() => { page--; }}
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <span>{page} / {totalPages}</span>
        <Button
          variant="outline" size="sm"
          disabled={page >= totalPages}
          onclick={() => { page++; }}
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  {/if}
</div>

<!-- Snapshot Drawer -->
{#if drawerOpen && drawerLog}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm" onclick={closeSnapshot}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="bg-card shadow-2xl w-full max-w-2xl h-full flex flex-col animate-in slide-in-from-right duration-300" onclick={(e) => e.stopPropagation()}>
      <!-- Drawer Header -->
      <div class="p-6 shadow-[0_1px_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_rgba(255,255,255,0.05)] flex items-center justify-between bg-muted/30">
        <div>
          <h2 class="text-lg font-bold text-foreground flex items-center gap-2">
            <FileSearch class="h-5 w-5 text-primary" />
            {i18n.t('settings.auditSnapshot') ?? 'Change Snapshot'}
          </h2>
          <p class="text-xs text-muted-foreground mt-1">{formatDate(drawerLog.createdAt)} · {drawerLog.userName ?? drawerLog.userId}</p>
        </div>
        <button onclick={closeSnapshot} class="text-muted-foreground hover:text-foreground transition p-2 rounded-lg hover:bg-muted">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Meta Tags -->
      <div class="px-6 py-3 shadow-[0_1px_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_rgba(255,255,255,0.05)] flex items-center gap-2 flex-wrap">
        <Badge variant="outline">{drawerLog.action}</Badge>
        {#if drawerLog.resource}
          <Badge variant="secondary">{drawerLog.resource}</Badge>
        {/if}
        {#if drawerLog.ipAddress}
          <Badge variant="outline" class="font-mono text-xs">{drawerLog.ipAddress}</Badge>
        {/if}
      </div>

      <!-- JSON Diff Viewer -->
      <div class="flex-1 p-6 overflow-y-auto bg-foreground/[0.03] dark:bg-background/50">
        <pre class="whitespace-pre-wrap text-xs font-mono leading-relaxed text-foreground/80 bg-muted/30 rounded-lg p-4 border border-border">{typeof drawerLog.details === 'object' ? JSON.stringify(drawerLog.details, null, 2) : drawerLog.details}</pre>
      </div>

      <!-- Footer -->
      <div class="p-4 shadow-[0_-1px_0_rgba(0,0,0,0.05)] dark:shadow-[0_-1px_0_rgba(255,255,255,0.05)] bg-muted/20 text-right text-[11px] text-muted-foreground font-medium">
        System audit snapshot · Read-only
      </div>
    </div>
  </div>
{/if}
