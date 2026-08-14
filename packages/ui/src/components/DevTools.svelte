<script lang="ts">
  import { onMount } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { fly } from 'svelte/transition';
  import { useQueryClient } from '@tanstack/svelte-query';
  import {
    captureAdminContext,
    getColorTheme,
    getTheme,
    parseQueryKey,
  } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  import TooltipButton from './TooltipButton.svelte';
  import * as Tabs from './ui/tabs/index.js';
  import { Badge } from './ui/badge/index.js';
  import { ScrollArea } from './ui/scroll-area/index.js';
  import { Separator } from './ui/separator/index.js';
  import { X, Bug, ChevronDown, ChevronUp, Wand2 } from '@lucide/svelte';
  import InferencerPanel from './InferencerPanel.svelte';

  type CacheDiagnostics = {
    queries: { total: number; fetching: number; stale: number; errors: number };
    mutations: { total: number; pending: number; paused: number; errors: number };
  };

  type ProviderDiagnostic = {
    name: string;
    configured: boolean;
    capabilities: string;
  };

  type SafeQueryDiagnostic = {
    provider: string;
    resource: string;
    operation: string;
    status: string;
    retries: number;
    duration: string;
    cacheAge: string;
    invalidation: string;
  };

  const EMPTY_CACHE_DIAGNOSTICS: CacheDiagnostics = {
    queries: { total: 0, fetching: 0, stale: 0, errors: 0 },
    mutations: { total: 0, pending: 0, paused: 0, errors: 0 },
  };

  const isDev = import.meta.env.DEV;
  const i18n = useTranslation();
  const queryClient = useQueryClient();
  const adminContext = captureAdminContext();

  let { docked = false }: { docked?: boolean } = $props();
  let visible = $state(false);
  let collapsed = $state(false);
  let cacheDiagnostics = $state.raw<CacheDiagnostics>(EMPTY_CACHE_DIAGNOSTICS);
  let safeQueryDiagnostics = $state.raw<SafeQueryDiagnostic[]>([]);
  const queryTimings = new SvelteMap<string, { startedAt?: number; duration?: number }>();

  function toggle() {
    visible = !visible;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      toggle();
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
  }

  onMount(() => {
    if (!isDev) return;
    refreshCacheDiagnostics();
    const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
      // 观察器事件会在组件重渲染时成对出现。刷新诊断状态会再次触发渲染，
      // 因此这里只响应真正改变缓存内容或请求状态的事件。
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

  const frameworkProviders = $derived.by((): ProviderDiagnostic[] => {
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
        capabilities: audit ? 'create, get, update' : 'not configured',
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
</script>

<svelte:window onkeydown={isDev ? handleKeydown : undefined} />

{#if isDev}
  {#if visible}
    <div
      class="fixed bottom-0 right-4 z-[9999] w-[560px] max-w-[95vw] rounded-t-xl border border-b-0 bg-card shadow-2xl text-[0.8125rem] overflow-hidden"
      class:w-auto={collapsed}
      class:min-w-[200px]={collapsed}
      transition:fly={{ y: 400, duration: 300 }}
    >
      <div class="flex items-center justify-between px-3 py-2 bg-muted border-b">
        <div class="flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider text-foreground">
          <Bug class="h-4 w-4" />
          <span>svadmin DevTools</span>
        </div>
        <div class="flex gap-1">
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
          <Tabs.List class="grid w-full grid-cols-4 h-8 rounded-none border-b">
            <Tabs.Trigger value="state" class="text-xs data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">State</Tabs.Trigger>
            <Tabs.Trigger value="providers" class="text-xs data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Providers</Tabs.Trigger>
            <Tabs.Trigger value="cache" class="text-xs data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Cache</Tabs.Trigger>
            <Tabs.Trigger value="inferencer" class="text-xs data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              <Wand2 class="h-3 w-3 mr-1" /> Inferencer
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

                <p class="text-[0.6875rem] text-muted-foreground sm:col-span-2">
                  Query keys, variables, cached records, mutation payloads, and error bodies are intentionally hidden.
                </p>
              </div>
            </ScrollArea>
          </Tabs.Content>

          <Tabs.Content value="inferencer" class="p-0">
            <InferencerPanel />
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
