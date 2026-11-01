<script lang="ts">
  import { onMount } from 'svelte';
  import { DEV } from 'esm-env';
  import { SvelteMap } from 'svelte/reactivity';
  import { fly } from 'svelte/transition';
  import { useQueryClient } from '@tanstack/svelte-query';
  import {
    captureAdminContext,
    getColorTheme,
    getTheme,
    parseQueryKey,
  } from '@svadmin/core';
  import {
    buildAdminDiagnostics,
    buildSelfHealingReport,
    captureRuntimeError,
    type DevtoolsDiagnostic,
  } from '@svadmin/devtools';
  import { useTranslation } from '@svadmin/core/i18n';
  import {
    attachSvadminDevtoolsQueryClient,
    installSvadminDevtoolsBridge,
    publishSvadminDevtoolsSnapshot,
    runSvadminDevtoolsCacheAction,
  } from '../devtools-bridge.js';
  import {
    componentSource,
    filterInspectorRows,
    redactValueSummary,
    type DevtoolsInspectorRow,
    type DevtoolsTimelineEntry,
  } from '../devtools-inspector.js';

  import TooltipButton from './TooltipButton.svelte';
  import * as Tabs from './ui/tabs/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Button } from './ui/button/index.js';
  import { ScrollArea } from './ui/scroll-area/index.js';
  import { Separator } from './ui/separator/index.js';
  import { X, Bug, ChevronDown, ChevronUp, Wand2, Crosshair, Check, AlertCircle, Copy } from '@lucide/svelte';
  import InferencerPanel from './InferencerPanel.svelte';

  import type {
    DevtoolsCacheDiagnostics,
    DevtoolsProviderDiagnostic,
    DevtoolsQueryDiagnostic,
  } from '../devtools-bridge.js';

  const EMPTY_CACHE_DIAGNOSTICS: DevtoolsCacheDiagnostics = {
    queries: { total: 0, fetching: 0, stale: 0, errors: 0 },
    mutations: { total: 0, pending: 0, paused: 0, errors: 0 },
  };

  const isDev = DEV;
  const i18n = useTranslation();
  const queryClient = useQueryClient();
  const adminContext = captureAdminContext();

  let { docked = false }: { docked?: boolean } = $props();
  let visible = $state(false);
  let collapsed = $state(false);
  let cacheDiagnostics = $state.raw<DevtoolsCacheDiagnostics>(EMPTY_CACHE_DIAGNOSTICS);
  let safeQueryDiagnostics = $state.raw<DevtoolsQueryDiagnostic[]>([]);
  let invalidations = $state.raw<Array<{ at: number; provider: string; resource: string; operation: string }>>([]);
  let inspectorRows = $state.raw<DevtoolsInspectorRow[]>([]);
  let timeline = $state.raw<DevtoolsTimelineEntry[]>([]);
  let filterText = $state('');
  let filterKind = $state<'all' | 'query' | 'mutation'>('all');
  let filterResource = $state('all');
  let filterStatus = $state('all');
  let filterComponent = $state('');
  const queryTimings = new SvelteMap<string, { startedAt?: number; duration?: number }>();
  const triggers = new Map<string, string>();

  function pushTimeline(entry: DevtoolsTimelineEntry) {
    timeline = [entry, ...timeline].slice(0, 24);
  }

  async function replayRow(row: DevtoolsInspectorRow) {
    if (row.kind !== 'query') return;
    triggers.set(row.id, 'devtools-replay');
    pushTimeline({
      at: Date.now(),
      kind: 'query',
      resource: row.resource,
      operation: row.operation,
      status: 'refetch',
      trigger: 'devtools-replay',
      source: 'devtools',
    });
    try {
      await runSvadminDevtoolsCacheAction({
        action: 'refetch',
        selector: {
          provider: row.provider,
          ...(row.resource === '—' || row.resource === '[custom]' || row.resource === '[mutation]' ? {} : { resource: row.resource }),
          operation: row.operation,
        },
      });
    } catch {
      pushTimeline({
        at: Date.now(),
        kind: 'query',
        resource: row.resource,
        operation: row.operation,
        status: 'error',
        trigger: 'devtools-replay',
        source: 'devtools',
      });
    }
  }

  function toggle() {
    visible = !visible;
  }

  let inspecting = $state(false);
  let hoveredBox = $state<{
    x: number;
    y: number;
    width: number;
    height: number;
    component: string;
    resource?: string;
    field?: string;
  } | null>(null);
  let toastMessage = $state<string | null>(null);

  function showToast(msg: string) {
    toastMessage = msg;
    setTimeout(() => {
      if (toastMessage === msg) toastMessage = null;
    }, 2500);
  }

  function toggleInspector() {
    inspecting = !inspecting;
    if (!inspecting) hoveredBox = null;
  }

  function handleDocumentMouseMove(event: MouseEvent) {
    if (!inspecting) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('.svadmin-devtools-container') || target.closest('[data-svadmin-inspector-overlay]')) return;

    const compEl = target.closest('[data-svadmin-component]') as HTMLElement | null;
    const fieldEl = target.closest('[data-svadmin-field]') as HTMLElement | null;

    if (compEl || fieldEl) {
      const el = fieldEl ?? compEl!;
      const rect = el.getBoundingClientRect();
      hoveredBox = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        component: compEl?.getAttribute('data-svadmin-component') ?? 'Component',
        resource: compEl?.getAttribute('data-svadmin-resource') ?? undefined,
        field: fieldEl?.getAttribute('data-svadmin-field') ?? undefined,
      };
    } else {
      hoveredBox = null;
    }
  }

  function handleDocumentClick(event: MouseEvent) {
    if (!inspecting || !hoveredBox) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('.svadmin-devtools-container') || target?.closest('[data-svadmin-inspector-overlay]')) return;

    event.preventDefault();
    event.stopPropagation();

    const prompt = hoveredBox.field && hoveredBox.resource
      ? `在 svadmin 中修改资源 '${hoveredBox.resource}' 的 <${hoveredBox.component}> 组件：为字段 '${hoveredBox.field}' 定制显示与交互效果。`
      : hoveredBox.resource
      ? `在 svadmin 中定制资源 '${hoveredBox.resource}' 的 <${hoveredBox.component}> 组件。`
      : `在 svadmin 中定制 <${hoveredBox.component}> 组件。`;

    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(prompt);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('svadmin:vibe-inspect', {
          detail: { ...hoveredBox, prompt },
        }),
      );
    }

    showToast('已复制 AI Prompt！可直接在对话框中粘贴');
    inspecting = false;
    hoveredBox = null;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      toggle();
    }
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'x') {
      event.preventDefault();
      toggleInspector();
    }
    if (event.key === 'Escape' && inspecting) {
      inspecting = false;
      hoveredBox = null;
    }
  }

  function refreshCacheDiagnostics() {
    const queries = queryClient.getQueryCache().getAll();
    const mutations = queryClient.getMutationCache().getAll();
    const now = Date.now();
    cacheDiagnostics = {
      queries: {
        total: queries.length,
        fetching: queries.filter((query) => query.state.fetchStatus === 'fetching').length,
        stale: queries.filter((query) => query.isStale()).length,
        errors: queries.filter((query) => query.state.status === 'error').length,
      },
      mutations: {
        total: mutations.length,
        pending: mutations.filter((mutation) => mutation.state.status === 'pending').length,
        paused: mutations.filter((mutation) => mutation.state.isPaused).length,
        errors: mutations.filter((mutation) => mutation.state.status === 'error').length,
      },
    };
    safeQueryDiagnostics = queries.flatMap((query) => {
      const descriptor = parseQueryKey(query.queryKey);
      if (!descriptor) return [];
      return [{
        provider: descriptor.provider,
        resource: descriptor.kind === 'custom' ? '[custom]' : (descriptor.resource ?? '—'),
        operation: `${descriptor.kind}:${descriptor.action ?? 'call'}`,
        status: query.state.fetchStatus === 'fetching' ? 'fetching' : query.state.status,
        retries: query.state.fetchFailureCount,
        duration: queryTimings.get(query.queryHash)?.duration === undefined
          ? '—'
          : `${queryTimings.get(query.queryHash)?.duration}ms`,
        cacheAge: query.state.dataUpdatedAt > 0
          ? `${Math.max(0, Math.floor((now - query.state.dataUpdatedAt) / 1000))}s`
          : '—',
        invalidation: query.state.isInvalidated ? 'cache invalidation' : '—',
      }];
    });
    const queryRows: DevtoolsInspectorRow[] = queries.flatMap((query) => {
      const descriptor = parseQueryKey(query.queryKey);
      if (!descriptor) return [];
      const loose = query as typeof query & {
        meta?: unknown;
        options?: { meta?: unknown };
        observers?: readonly unknown[];
      };
      const attribution = componentSource(loose.meta ?? loose.options?.meta, loose.observers?.length ?? 0);
      const resource = descriptor.kind === 'custom' ? '[custom]' : (descriptor.resource ?? '—');
      const operation = `${descriptor.kind}:${descriptor.action ?? 'call'}`;
      return [{
        id: query.queryHash,
        kind: 'query' as const,
        provider: descriptor.provider,
        resource,
        operation,
        status: query.state.fetchStatus === 'fetching' ? 'fetching' : query.state.status,
        component: attribution.component,
        trigger: triggers.get(query.queryHash) ?? 'cache',
        source: attribution.source,
        requestSummary: redactValueSummary({ operation, resource }),
        responseSummary: redactValueSummary(query.state.data),
      }];
    });
    const mutationRows: DevtoolsInspectorRow[] = mutations.map((mutation, index) => {
      const loose = mutation as typeof mutation & {
        mutationId?: number;
        options?: { meta?: unknown };
        state: { status: string; variables?: unknown; data?: unknown };
      };
      const attribution = componentSource(loose.options?.meta, 0);
      const id = `mutation:${loose.mutationId ?? index}`;
      return {
        id,
        kind: 'mutation' as const,
        provider: 'mutation',
        resource: '[mutation]',
        operation: 'mutation',
        status: loose.state.status,
        component: attribution.component,
        trigger: triggers.get(id) ?? 'mutation',
        source: attribution.source,
        requestSummary: redactValueSummary(loose.state.variables),
        responseSummary: redactValueSummary(loose.state.data),
      };
    });
    inspectorRows = [...queryRows, ...mutationRows];
  }

  const filteredInspectorRows = $derived(filterInspectorRows(inspectorRows, {
    text: filterText,
    kind: filterKind,
    resource: filterResource,
    status: filterStatus,
    component: filterComponent,
  }));
  const inspectorResources = $derived(['all', ...new Set(inspectorRows.map((row) => row.resource))]);

  onMount(() => {
    if (!isDev) return;
    attachSvadminDevtoolsQueryClient(queryClient);
    installSvadminDevtoolsBridge();
    refreshCacheDiagnostics();
    const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
      // Observer events arrive in pairs during component rerenders. Refreshing diagnostics triggers another render,
      // so respond only to events that actually change cached content or request state.
      if (event.type.startsWith('observer')) return;
      if (event.type === 'removed') {
        queryTimings.delete(event.query.queryHash);
      } else if (event.type === 'updated') {
        const current = queryTimings.get(event.query.queryHash) ?? {};
        if (event.action.type === 'fetch') {
          queryTimings.set(event.query.queryHash, { startedAt: Date.now() });
        } else if ((event.action.type === 'success' || event.action.type === 'error') && current.startedAt !== undefined) {
          queryTimings.set(event.query.queryHash, {
            duration: Math.max(0, Date.now() - current.startedAt),
          });
        } else if (event.action.type === 'invalidate') {
          const descriptor = parseQueryKey(event.query.queryKey);
          if (descriptor) {
            invalidations = [{
              at: Date.now(),
              provider: descriptor.provider,
              resource: descriptor.kind === 'custom' ? '[custom]' : (descriptor.resource ?? '—'),
              operation: `${descriptor.kind}:${descriptor.action ?? 'call'}`,
            }, ...invalidations].slice(0, 8);
          }
        }
        const descriptor = parseQueryKey(event.query.queryKey);
        if (descriptor) {
          const trigger = event.action.type;
          triggers.set(event.query.queryHash, trigger);
          pushTimeline({
            at: Date.now(),
            kind: 'query',
            resource: descriptor.kind === 'custom' ? '[custom]' : (descriptor.resource ?? '—'),
            operation: `${descriptor.kind}:${descriptor.action ?? 'call'}`,
            status: event.query.state.fetchStatus === 'fetching' ? 'fetching' : event.query.state.status,
            trigger,
            source: 'query-cache',
          });
        }
      }
      refreshCacheDiagnostics();
    });
    const unsubscribeMutations = queryClient.getMutationCache().subscribe(refreshCacheDiagnostics);
    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  });

  const resources = $derived(adminContext.resources);
  const path = $derived(adminContext.currentPath());
  const theme = $derived(getTheme());
  const colorTheme = $derived(getColorTheme());
  const locale = $derived(i18n.locale);
  const appDiagnostics = $derived(buildAdminDiagnostics({
    providers: adminContext.providerBundle,
    resources,
    basePath: path,
  }));

  const dataProviders = $derived.by(() => {
    try {
      return adminContext.getDataProviderNames().map((name) => {
        const provider = adminContext.getDataProvider(name);
        const capabilities = [
          provider.getMany || provider.createMany || provider.updateMany || provider.deleteMany ? 'bulk' : undefined,
          provider.custom ? 'custom' : undefined,
        ].filter((capability): capability is string => Boolean(capability));
        const resourceCount = resources.filter((resource) =>
          (resource.provider?.dataProviderName ?? resource.meta?.dataProviderName ?? 'default') === name,
        ).length;
        return {
          name,
          resourceCount,
          capabilities: capabilities.length > 0 ? capabilities.join(', ') : 'CRUD',
        };
      });
    } catch {
      return [];
    }
  });

  const frameworkProviders = $derived.by((): DevtoolsProviderDiagnostic[] => {
    const access = adminContext.accessControlProvider;
    const audit = adminContext.auditLogProvider;
    const notification = adminContext.notificationProvider;
    const chat = adminContext.chatProvider;
    const agent = adminContext.agentProvider;
    const live = adminContext.liveProvider;
    const task = adminContext.taskProvider;
    const auth = adminContext.authProvider;

    return [
      {
        name: 'Auth',
        configured: Boolean(auth),
        capabilities: auth
          ? [auth.getPermissions ? 'permissions' : undefined, auth.getRoles ? 'roles' : undefined]
              .filter((capability): capability is string => Boolean(capability))
              .join(', ') || 'identity'
          : 'not configured',
      },
      {
        name: 'Access control',
        configured: Boolean(access),
        capabilities: access?.options?.buttons?.enableAccessControl ? 'button checks enabled' : access ? 'policy checks' : 'not configured',
      },
      {
        name: 'Live',
        configured: Boolean(live),
        capabilities: live
          ? ['subscribe', live.publish ? 'publish' : undefined, live.unsubscribe ? 'unsubscribe' : undefined]
              .filter((capability): capability is string => Boolean(capability))
              .join(', ')
          : 'not configured',
      },
      {
        name: 'Audit',
        configured: Boolean(audit),
        capabilities: audit ? 'create, get' : 'not configured',
      },
      {
        name: 'Notification',
        configured: Boolean(notification),
        capabilities: notification ? 'open, close' : 'built-in toast fallback',
      },
      {
        name: 'Chat',
        configured: Boolean(chat),
        capabilities: chat ? 'message stream' : 'not configured',
      },
      {
        name: 'Agent',
        configured: Boolean(agent),
        capabilities: agent ? `${agent.tools?.length ?? 0} tools (names hidden)` : 'not configured',
      },
      {
        name: 'Task',
        configured: Boolean(task),
        capabilities: task
          ? [task.list ? 'list' : undefined, task.subscribe ? 'subscribe' : undefined, task.retry ? 'retry' : undefined, task.cancel ? 'cancel' : undefined]
              .filter((capability): capability is string => Boolean(capability))
              .join(', ') || 'submit, get'
          : 'not configured',
      },
      {
        name: 'Tenant',
        configured: Boolean(adminContext.tenant),
        capabilities: adminContext.tenant ? 'tree scoped (identifier hidden)' : 'not configured',
      },
    ];
  });

  $effect(() => {
    if (!isDev) return;
    publishSvadminDevtoolsSnapshot({
      version: 1,
      environment: 'development',
      route: path,
      locale,
      theme,
      colorTheme,
      resourceCount: resources.length,
      providers: frameworkProviders,
      cache: cacheDiagnostics,
      queries: safeQueryDiagnostics,
    });
  });
</script>

<svelte:window
  onkeydown={isDev ? handleKeydown : undefined}
  onmousemove={isDev && inspecting ? handleDocumentMouseMove : undefined}
  onclickcapture={isDev && inspecting ? handleDocumentClick : undefined}
/>

{#if isDev}
  {#if inspecting && hoveredBox}
    <div
      data-svadmin-inspector-overlay
      class="pointer-events-none fixed z-[999999] border-2 border-dashed border-primary bg-primary/10 transition-all duration-75"
      style="left: {hoveredBox.x}px; top: {hoveredBox.y}px; width: {hoveredBox.width}px; height: {hoveredBox.height}px;"
    >
      <div class="absolute -top-7 left-0 flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-xs font-mono font-medium text-primary-foreground shadow">
        <span>&lt;{hoveredBox.component}&gt;</span>
        {#if hoveredBox.resource}
          <span class="opacity-80">res: {hoveredBox.resource}</span>
        {/if}
        {#if hoveredBox.field}
          <span class="opacity-80">field: {hoveredBox.field}</span>
        {/if}
        <span class="ml-1 text-[10px] opacity-75">(点击复制 AI Prompt)</span>
      </div>
    </div>
  {/if}

  {#if toastMessage}
    <div
      in:fly={{ y: 20, duration: 150 }}
      out:fade={{ duration: 150 }}
      class="fixed bottom-16 right-6 z-[999999] flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg"
    >
      <Check class="h-4 w-4" />
      <span>{toastMessage}</span>
    </div>
  {/if}

  {#if visible}
    <div
      class="fixed bottom-0 right-4 z-[9999] w-[560px] max-w-[95vw] rounded-t-xl border border-b-0 bg-card shadow-2xl text-[0.8125rem] overflow-hidden"
      class:svadmin-devtools--collapsed-width={collapsed}
      class:svadmin-devtools--collapsed-min-width={collapsed}
      transition:fly={{ y: 400, duration: 300 }}
    >
      <div class="flex items-center justify-between px-3 py-2 bg-muted border-b">
        <div class="flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider text-foreground">
          <Bug class="h-4 w-4" />
          <span>svadmin DevTools</span>
          <Badge variant={appDiagnostics.health.status === 'error' ? 'destructive' : appDiagnostics.health.status === 'warning' ? 'outline' : 'secondary'}>
            {appDiagnostics.health.status}
          </Badge>
        </div>
        <div class="flex gap-1">
          <TooltipButton
            tooltip={inspecting ? '退出点选检查 (Exit Inspect)' : '🎯 点选检查 / Vibe Inspect (Ctrl+Shift+X)'}
            variant={inspecting ? 'default' : 'ghost'}
            size="icon"
            class="h-6 w-6 {inspecting ? 'bg-primary text-primary-foreground' : ''}"
            onclick={toggleInspector}
          >
            <Crosshair class="h-3.5 w-3.5" />
          </TooltipButton>
          <TooltipButton tooltip={collapsed ? i18n.t('common.expand') : i18n.t('common.collapse')} variant="ghost" size="icon" class="h-6 w-6" onclick={() => collapsed = !collapsed}>
            {#if collapsed}
              <ChevronUp class="h-3.5 w-3.5" />
            {:else}
              <ChevronDown class="h-3.5 w-3.5" />
            {/if}
          </TooltipButton>
          <TooltipButton tooltip={i18n.t('common.close')} variant="ghost" size="icon" class="h-6 w-6" onclick={toggle}>
            <X class="h-3.5 w-3.5" />
          </TooltipButton>
        </div>
      </div>

      {#if !collapsed}
        <Tabs.Root value="state" class="w-full">
          <Tabs.List class="grid w-full grid-cols-5 h-8 rounded-none border-b">
            <Tabs.Trigger value="state" class="text-xs data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">State</Tabs.Trigger>
            <Tabs.Trigger value="providers" class="text-xs data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Providers</Tabs.Trigger>
            <Tabs.Trigger value="cache" class="text-xs data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Cache</Tabs.Trigger>
            <Tabs.Trigger value="inferencer" class="text-xs data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              <Wand2 class="h-3 w-3 mr-1" /> Inferencer
            </Tabs.Trigger>
            <Tabs.Trigger value="selfhealing" class="text-xs data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              Self-Healing
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="state" class="p-0">
            <ScrollArea class="max-h-[420px]">
              <div class="p-2 space-y-1">
                <div class="py-1">
                  <h4 class="text-[0.6875rem] font-bold uppercase tracking-widest text-muted-foreground mb-1 px-1">Router</h4>
                  <div class="flex items-center justify-between px-1 py-0.5 rounded hover:bg-muted/50">
                    <span class="text-xs text-foreground">Path</span>
                    <Badge variant="secondary" class="font-mono text-[0.6875rem]">{path}</Badge>
                  </div>
                </div>

                <Separator />

                <div class="py-1">
                  <h4 class="text-[0.6875rem] font-bold uppercase tracking-widest text-muted-foreground mb-1 px-1">Theme</h4>
                  <div class="flex items-center justify-between px-1 py-0.5 rounded hover:bg-muted/50">
                    <span class="text-xs text-foreground">Mode</span>
                    <Badge variant="secondary" class="font-mono text-[0.6875rem]">{theme}</Badge>
                  </div>
                  <div class="flex items-center justify-between px-1 py-0.5 rounded hover:bg-muted/50">
                    <span class="text-xs text-foreground">Color</span>
                    <Badge variant="secondary" class="font-mono text-[0.6875rem]">{colorTheme}</Badge>
                  </div>
                </div>

                <Separator />

                <div class="py-1">
                  <h4 class="text-[0.6875rem] font-bold uppercase tracking-widest text-muted-foreground mb-1 px-1">i18n</h4>
                  <div class="flex items-center justify-between px-1 py-0.5 rounded hover:bg-muted/50">
                    <span class="text-xs text-foreground">Locale</span>
                    <Badge variant="secondary" class="font-mono text-[0.6875rem]">{locale}</Badge>
                  </div>
                </div>

                <Separator />

                <div class="py-1">
                  <h4 class="text-[0.6875rem] font-bold uppercase tracking-widest text-muted-foreground mb-1 px-1">Resources ({resources.length})</h4>
                  {#each resources as resource (resource.identifier ?? resource.name)}
                    <div class="flex items-center justify-between px-1 py-0.5 rounded hover:bg-muted/50">
                      <span class="text-xs text-foreground">{resource.name}</span>
                      <Badge variant="outline" class="font-mono text-[0.6875rem]">{resource.fields.length} fields</Badge>
                    </div>
                  {/each}
                </div>
              </div>
            </ScrollArea>
          </Tabs.Content>

          <Tabs.Content value="providers" class="p-0">
            <ScrollArea class="max-h-[420px]">
              <div class="p-3 space-y-3">
                <div class="rounded-md border bg-muted/20 p-2 text-[0.6875rem] text-muted-foreground">
                  Sensitive values are hidden: endpoints, credentials, record data, messages, and live/audit payloads.
                </div>

                <section class="space-y-1.5">
                  <h4 class="text-[0.6875rem] font-bold uppercase tracking-widest text-muted-foreground">Data providers ({dataProviders.length})</h4>
                  {#each dataProviders as provider (provider.name)}
                    <div class="rounded-md border px-2.5 py-2">
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-medium text-foreground">{provider.name}</span>
                        <Badge variant="outline">{provider.resourceCount} resources</Badge>
                      </div>
                      <div class="mt-1 flex items-center justify-between gap-2 text-[0.6875rem] text-muted-foreground">
                        <span>{provider.capabilities}</span>
                        <span>Endpoint hidden</span>
                      </div>
                    </div>
                  {/each}
                </section>

                <Separator />

                <section class="space-y-1">
                  <h4 class="text-[0.6875rem] font-bold uppercase tracking-widest text-muted-foreground">Framework providers</h4>
                  {#each frameworkProviders as provider (provider.name)}
                    <div class="flex items-center justify-between gap-3 rounded px-1 py-1 hover:bg-muted/50">
                      <div class="min-w-0">
                        <div class="text-xs text-foreground">{provider.name}</div>
                        <div class="truncate text-[0.6875rem] text-muted-foreground">{provider.capabilities}</div>
                      </div>
                      <Badge variant={provider.configured ? 'secondary' : 'outline'}>{provider.configured ? 'configured' : 'fallback'}</Badge>
                    </div>
                  {/each}
                </section>
              </div>
            </ScrollArea>
          </Tabs.Content>

          <Tabs.Content value="cache" class="p-0">
            <ScrollArea class="max-h-[420px]">
              <div class="grid gap-3 p-3 sm:grid-cols-2">
                <section class="rounded-md border p-3">
                  <div class="mb-2 flex items-center justify-between">
                    <h4 class="text-xs font-semibold text-foreground">Queries</h4>
                    <Badge variant="secondary" data-testid="devtools-query-total">{cacheDiagnostics.queries.total}</Badge>
                  </div>
                  <dl class="space-y-1 text-xs">
                    <div class="flex justify-between"><dt class="text-muted-foreground">Fetching</dt><dd>{cacheDiagnostics.queries.fetching}</dd></div>
                    <div class="flex justify-between"><dt class="text-muted-foreground">Stale</dt><dd>{cacheDiagnostics.queries.stale}</dd></div>
                    <div class="flex justify-between"><dt class="text-muted-foreground">Errors</dt><dd>{cacheDiagnostics.queries.errors}</dd></div>
                  </dl>
                </section>

                <section class="rounded-md border p-3">
                  <div class="mb-2 flex items-center justify-between">
                    <h4 class="text-xs font-semibold text-foreground">Mutations</h4>
                    <Badge variant="secondary" data-testid="devtools-mutation-total">{cacheDiagnostics.mutations.total}</Badge>
                  </div>
                  <dl class="space-y-1 text-xs">
                    <div class="flex justify-between"><dt class="text-muted-foreground">Pending</dt><dd>{cacheDiagnostics.mutations.pending}</dd></div>
                    <div class="flex justify-between"><dt class="text-muted-foreground">Paused</dt><dd>{cacheDiagnostics.mutations.paused}</dd></div>
                    <div class="flex justify-between"><dt class="text-muted-foreground">Errors</dt><dd>{cacheDiagnostics.mutations.errors}</dd></div>
                  </dl>
                </section>

                <section class="space-y-1.5 sm:col-span-2">
                  <div class="flex items-center justify-between">
                    <h4 class="text-xs font-semibold text-foreground">Recent invalidations</h4>
                    <Badge variant="secondary" data-testid="devtools-invalidation-total">{invalidations.length}</Badge>
                  </div>
                  {#if invalidations.length === 0}
                    <div class="rounded-md border px-2.5 py-2 text-[0.6875rem] text-muted-foreground">
                      No query invalidations yet.
                    </div>
                  {:else}
                    {#each invalidations as invalidation, index (`${invalidation.at}:${invalidation.provider}:${index}`)}
                      <div class="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-xs" data-testid="devtools-invalidation">
                        <span class="font-medium text-foreground">{invalidation.provider} · {invalidation.resource}</span>
                        <Badge variant="outline">{invalidation.operation}</Badge>
                      </div>
                    {/each}
                  {/if}
                </section>

                <section class="space-y-1.5 sm:col-span-2">
                  <div class="flex items-center justify-between">
                    <h4 class="text-xs font-semibold text-foreground">Safe query operations</h4>
                    <span class="text-[0.6875rem] text-muted-foreground">IDs, tenant and params hidden</span>
                  </div>
                  {#if safeQueryDiagnostics.length === 0}
                    <div class="rounded-md border px-2.5 py-2 text-[0.6875rem] text-muted-foreground">
                      No Query Key v2 operations in cache.
                    </div>
                  {:else}
                    {#each safeQueryDiagnostics as query, index (`${query.provider}:${query.resource}:${query.operation}:${index}`)}
                      <div class="rounded-md border px-2.5 py-2" data-testid="devtools-query-operation">
                        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span class="font-medium text-foreground">{query.provider} · {query.resource}</span>
                          <Badge variant="outline">{query.operation}</Badge>
                        </div>
                        <dl class="mt-1 grid grid-cols-5 gap-2 text-[0.6875rem] text-muted-foreground">
                          <div><dt>Status</dt><dd class="text-foreground">{query.status}</dd></div>
                          <div><dt>Retries</dt><dd class="text-foreground">{query.retries}</dd></div>
                          <div><dt>Duration</dt><dd class="text-foreground">{query.duration}</dd></div>
                          <div><dt>Cache age</dt><dd class="text-foreground">{query.cacheAge}</dd></div>
                          <div><dt>Invalidation</dt><dd class="text-foreground">{query.invalidation}</dd></div>
                        </dl>
                      </div>
                    {/each}
                  {/if}
                </section>

                <section class="space-y-2 sm:col-span-2" data-testid="devtools-inspector">
                  <h4 class="text-xs font-semibold text-foreground">Activity filters</h4>
                  <div class="grid gap-2 sm:grid-cols-2">
                    <input
                      class="h-8 rounded-md border bg-background px-2 text-xs"
                      placeholder="Filter query, mutation, resource, status, component"
                      data-testid="devtools-filter-query"
                      bind:value={filterText}
                    />
                    <input
                      class="h-8 rounded-md border bg-background px-2 text-xs"
                      placeholder="Component"
                      data-testid="devtools-filter-component"
                      bind:value={filterComponent}
                    />
                    <select class="h-8 rounded-md border bg-background px-2 text-xs" data-testid="devtools-filter-kind" bind:value={filterKind}>
                      <option value="all">All kinds</option>
                      <option value="query">Queries</option>
                      <option value="mutation">Mutations</option>
                    </select>
                    <select class="h-8 rounded-md border bg-background px-2 text-xs" data-testid="devtools-filter-status" bind:value={filterStatus}>
                      <option value="all">All statuses</option>
                      <option value="success">success</option>
                      <option value="error">error</option>
                      <option value="fetching">fetching</option>
                      <option value="pending">pending</option>
                    </select>
                    <select class="h-8 rounded-md border bg-background px-2 text-xs sm:col-span-2" data-testid="devtools-filter-resource" bind:value={filterResource}>
                      {#each inspectorResources as resource (resource)}
                        <option value={resource}>{resource}</option>
                      {/each}
                    </select>
                  </div>
                  {#if filteredInspectorRows.length === 0}
                    <div class="rounded-md border px-2.5 py-2 text-[0.6875rem] text-muted-foreground">No matching activity.</div>
                  {:else}
                    {#each filteredInspectorRows as row (row.id)}
                      <div class="rounded-md border px-2.5 py-2 text-xs" data-testid="devtools-inspector-row">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <span class="font-medium text-foreground">{row.kind} · {row.provider} · {row.resource}</span>
                          <Badge variant="outline">{row.operation}</Badge>
                        </div>
                        <dl class="mt-1 grid grid-cols-2 gap-1 text-[0.6875rem] text-muted-foreground sm:grid-cols-4">
                          <div><dt>Status</dt><dd class="text-foreground">{row.status}</dd></div>
                          <div><dt>Trigger</dt><dd class="text-foreground">{row.trigger}</dd></div>
                          <div><dt>Source</dt><dd class="text-foreground">{row.source}</dd></div>
                          <div><dt>Component</dt><dd class="text-foreground">{row.component}</dd></div>
                        </dl>
                        <p class="mt-1 text-[0.6875rem] text-muted-foreground" data-testid="devtools-redacted-payload">request {row.requestSummary} · response {row.responseSummary}</p>
                        {#if row.kind === 'query'}
                          <button type="button" class="mt-1 text-[0.6875rem] underline" data-testid="devtools-refetch" onclick={() => replayRow(row)}>
                            Refetch
                          </button>
                        {/if}
                      </div>
                    {/each}
                  {/if}
                </section>

                <section class="space-y-1.5 sm:col-span-2">
                  <h4 class="text-xs font-semibold text-foreground">Dependency updates</h4>
                  {#if timeline.length === 0}
                    <div class="rounded-md border px-2.5 py-2 text-[0.6875rem] text-muted-foreground">No dependency updates yet.</div>
                  {:else}
                    {#each timeline as entry, index (`${entry.at}:${entry.operation}:${index}`)}
                      <div class="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-xs" data-testid="devtools-timeline">
                        <span>{entry.resource} · {entry.operation}</span>
                        <Badge variant="outline">{entry.trigger} · {entry.source}</Badge>
                      </div>
                    {/each}
                  {/if}
                </section>

                <p class="text-[0.6875rem] text-muted-foreground sm:col-span-2">
                  Query keys, variables, cached records, mutation payloads, and error bodies are intentionally hidden.
                </p>
              </div>
            </ScrollArea>
          </Tabs.Content>

          <Tabs.Content value="inferencer" class="p-0">
            <InferencerPanel />
          </Tabs.Content>

          <Tabs.Content value="selfhealing" class="p-0">
            <ScrollArea class="max-h-[420px]">
              <div class="p-3 space-y-3">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Runtime Self-Healing</h4>
                    <p class="text-xs text-muted-foreground">AI 自动排障诊断报告与一键自愈</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7 text-xs flex items-center gap-1.5"
                    onclick={() => {
                      const report = buildSelfHealingReport(appDiagnostics.snapshot.diagnostics);
                      if (navigator?.clipboard?.writeText) {
                        void navigator.clipboard.writeText(report.agentPrompt);
                        showToast('已复制 AI 自愈 Prompt！');
                      }
                    }}
                  >
                    <Copy class="h-3.5 w-3.5" />
                    <span>复制自愈 Prompt</span>
                  </Button>
                </div>

                <Separator />

                {#if appDiagnostics.snapshot.diagnostics.filter(d => d.severity === 'error').length === 0}
                  <div class="flex flex-col items-center justify-center py-6 text-center text-muted-foreground space-y-1">
                    <Check class="h-8 w-8 text-green-500 mb-1" />
                    <p class="text-xs font-medium text-foreground">当前应用状态健康，无未解决异常</p>
                    <p class="text-[0.6875rem]">Provider 与资源契约已正确绑定</p>
                  </div>
                {:else}
                  <div class="space-y-2">
                    {#each appDiagnostics.snapshot.diagnostics.filter(d => d.severity === 'error') as diag}
                      <div class="p-2.5 rounded-lg border bg-muted/30 space-y-1">
                        <div class="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <AlertCircle class="h-3.5 w-3.5 text-destructive shrink-0" />
                          <span>[{diag.fix?.kind ?? 'ERROR'}] {diag.code}</span>
                        </div>
                        <p class="text-[0.6875rem] font-mono text-muted-foreground break-all">{diag.message}</p>
                        {#if diag.fix?.input?.suggestedAction}
                          <p class="text-xs text-foreground font-medium">💡 建议修复：{diag.fix.input.suggestedAction}</p>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </ScrollArea>
          </Tabs.Content>
        </Tabs.Root>
      {/if}
    </div>
  {:else}
    <TooltipButton
      tooltip={i18n.t('devtools.title')}
      variant="default"
      size="icon"
      class="{docked ? 'relative rounded-md shadow-sm' : 'fixed bottom-5 right-[4.75rem] rounded-full shadow-lg sm:bottom-7 sm:right-[5.5rem]'} z-[9999] h-9 w-9 opacity-60 hover:opacity-100 hover:scale-110 transition-all"
      onclick={toggle}
    >
      <Bug class="h-4 w-4" />
    </TooltipButton>
  {/if}
{/if}
