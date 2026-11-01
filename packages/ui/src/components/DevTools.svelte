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
  } from '../devtools-bridge.js';

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
  const queryTimings = new SvelteMap<string, { startedAt?: number; duration?: number }>();

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
  }

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
      class="svadmin-devtools-container svadmin-u-7bc555991dba svadmin-u-189f036c335c svadmin-u-5a438c30beec svadmin-u-f50571addf44 svadmin-u-11863ecc32e7 svadmin-u-c69e21ff5804 svadmin-u-1301e5c1ce71 svadmin-u-ca6bcd4b6f3f svadmin-u-d5e98261a758 svadmin-u-cd0ad9a56558 svadmin-u-14e46609fd68 svadmin-u-1d5904e7e755 svadmin-u-2cd02d11d1af"
      class:svadmin-devtools--collapsed-width={collapsed}
      class:svadmin-devtools--collapsed-min-width={collapsed}
      transition:fly={{ y: 400, duration: 300 }}
    >
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-2ef11f1cb219 svadmin-u-65fdbade2025">
        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568 svadmin-u-e83a7042bc91 svadmin-u-359090c2d529 uppercase svadmin-u-09ace3a4d9f5 svadmin-u-d4108abe6359">
          <Bug class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
          <span>svadmin DevTools</span>
          <Badge variant={appDiagnostics.health.status === 'error' ? 'destructive' : appDiagnostics.health.status === 'warning' ? 'outline' : 'secondary'}>
            {appDiagnostics.health.status}
          </Badge>
        </div>
        <div class="svadmin-u-60fbb7713999 svadmin-u-44ee8ba0a421">
          <TooltipButton
            tooltip={inspecting ? '退出点选检查 (Exit Inspect)' : '🎯 点选检查 / Vibe Inspect (Ctrl+Shift+X)'}
            variant={inspecting ? 'default' : 'ghost'}
            size="icon"
            class="svadmin-u-f6fe902450dc svadmin-u-7ec10f86d9b1 {inspecting ? 'bg-primary text-primary-foreground' : ''}"
            onclick={toggleInspector}
          >
            <Crosshair class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
          </TooltipButton>
          <TooltipButton tooltip={collapsed ? i18n.t('common.expand') : i18n.t('common.collapse')} variant="ghost" size="icon" class="svadmin-u-f6fe902450dc svadmin-u-7ec10f86d9b1" onclick={() => collapsed = !collapsed}>
            {#if collapsed}
              <ChevronUp class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            {:else}
              <ChevronDown class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            {/if}
          </TooltipButton>
          <TooltipButton tooltip={i18n.t('common.close')} variant="ghost" size="icon" class="svadmin-u-f6fe902450dc svadmin-u-7ec10f86d9b1" onclick={toggle}>
            <X class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
          </TooltipButton>
        </div>
      </div>

      {#if !collapsed}
        <Tabs.Root value="state" class="svadmin-u-6da6a3c3f741">
          <Tabs.List class="svadmin-u-f3c543ad5fe9 svadmin-u-6da6a3c3f741 svadmin-u-32aac21b02c8 svadmin-u-ed8a5df7b2fb svadmin-u-0c5e9137c7de svadmin-u-65fdbade2025">
            <Tabs.Trigger value="state" class="svadmin-u-359090c2d529 svadmin-u-9147fe04c981 svadmin-u-0c5e9137c7de svadmin-u-65ac0c49a5d5 svadmin-u-521fa0c7c407 svadmin-u-f28d099256d8">State</Tabs.Trigger>
            <Tabs.Trigger value="providers" class="svadmin-u-359090c2d529 svadmin-u-9147fe04c981 svadmin-u-0c5e9137c7de svadmin-u-65ac0c49a5d5 svadmin-u-521fa0c7c407 svadmin-u-f28d099256d8">Providers</Tabs.Trigger>
            <Tabs.Trigger value="cache" class="svadmin-u-359090c2d529 svadmin-u-9147fe04c981 svadmin-u-0c5e9137c7de svadmin-u-65ac0c49a5d5 svadmin-u-521fa0c7c407 svadmin-u-f28d099256d8">Cache</Tabs.Trigger>
            <Tabs.Trigger value="inferencer" class="svadmin-u-359090c2d529 svadmin-u-9147fe04c981 svadmin-u-0c5e9137c7de svadmin-u-65ac0c49a5d5 svadmin-u-521fa0c7c407 svadmin-u-f28d099256d8">
              <Wand2 class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-618162408e7a" /> Inferencer
            </Tabs.Trigger>
            <Tabs.Trigger value="selfhealing" class="svadmin-u-359090c2d529 svadmin-u-9147fe04c981 svadmin-u-0c5e9137c7de svadmin-u-65ac0c49a5d5 svadmin-u-521fa0c7c407 svadmin-u-f28d099256d8">
              Self-Healing
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="state" class="svadmin-u-8a539c7fe216">
            <ScrollArea class="svadmin-u-c6a5b7446421">
              <div class="svadmin-u-7660b450905a svadmin-u-da7c36cd8867">
                <div class="svadmin-u-660d2effb880">
                  <h4 class="svadmin-u-76067d04e222 svadmin-u-69450ef1487e uppercase svadmin-u-08cc9b1d44f8 svadmin-u-bfa603190748 svadmin-u-65281709dacf svadmin-u-d8e0e382c67b">Router</h4>
                  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-d8e0e382c67b svadmin-u-465609a240a8 svadmin-u-07389a777c1f svadmin-u-39f703dbe296">
                    <span class="svadmin-u-359090c2d529 svadmin-u-d4108abe6359">Path</span>
                    <Badge variant="secondary" class="svadmin-u-0e65706bcccd svadmin-u-76067d04e222">{path}</Badge>
                  </div>
                </div>

                <Separator />

                <div class="svadmin-u-660d2effb880">
                  <h4 class="svadmin-u-76067d04e222 svadmin-u-69450ef1487e uppercase svadmin-u-08cc9b1d44f8 svadmin-u-bfa603190748 svadmin-u-65281709dacf svadmin-u-d8e0e382c67b">Theme</h4>
                  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-d8e0e382c67b svadmin-u-465609a240a8 svadmin-u-07389a777c1f svadmin-u-39f703dbe296">
                    <span class="svadmin-u-359090c2d529 svadmin-u-d4108abe6359">Mode</span>
                    <Badge variant="secondary" class="svadmin-u-0e65706bcccd svadmin-u-76067d04e222">{theme}</Badge>
                  </div>
                  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-d8e0e382c67b svadmin-u-465609a240a8 svadmin-u-07389a777c1f svadmin-u-39f703dbe296">
                    <span class="svadmin-u-359090c2d529 svadmin-u-d4108abe6359">Color</span>
                    <Badge variant="secondary" class="svadmin-u-0e65706bcccd svadmin-u-76067d04e222">{colorTheme}</Badge>
                  </div>
                </div>

                <Separator />

                <div class="svadmin-u-660d2effb880">
                  <h4 class="svadmin-u-76067d04e222 svadmin-u-69450ef1487e uppercase svadmin-u-08cc9b1d44f8 svadmin-u-bfa603190748 svadmin-u-65281709dacf svadmin-u-d8e0e382c67b">i18n</h4>
                  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-d8e0e382c67b svadmin-u-465609a240a8 svadmin-u-07389a777c1f svadmin-u-39f703dbe296">
                    <span class="svadmin-u-359090c2d529 svadmin-u-d4108abe6359">Locale</span>
                    <Badge variant="secondary" class="svadmin-u-0e65706bcccd svadmin-u-76067d04e222">{locale}</Badge>
                  </div>
                </div>

                <Separator />

                <div class="svadmin-u-660d2effb880">
                  <h4 class="svadmin-u-76067d04e222 svadmin-u-69450ef1487e uppercase svadmin-u-08cc9b1d44f8 svadmin-u-bfa603190748 svadmin-u-65281709dacf svadmin-u-d8e0e382c67b">Resources ({resources.length})</h4>
                  {#each resources as resource (resource.identifier ?? resource.name)}
                    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-d8e0e382c67b svadmin-u-465609a240a8 svadmin-u-07389a777c1f svadmin-u-39f703dbe296">
                      <span class="svadmin-u-359090c2d529 svadmin-u-d4108abe6359">{resource.name}</span>
                      <Badge variant="outline" class="svadmin-u-0e65706bcccd svadmin-u-76067d04e222">{resource.fields.length} fields</Badge>
                    </div>
                  {/each}
                </div>
              </div>
            </ScrollArea>
          </Tabs.Content>

          <Tabs.Content value="providers" class="svadmin-u-8a539c7fe216">
            <ScrollArea class="svadmin-u-c6a5b7446421">
              <div class="svadmin-u-eb6e8b881acd svadmin-u-6ed543e2fbbb">
                <div class="svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-967d113a1451 svadmin-u-7660b450905a svadmin-u-76067d04e222 svadmin-u-bfa603190748">
                  Sensitive values are hidden: endpoints, credentials, record data, messages, and live/audit payloads.
                </div>

                <section class="svadmin-u-5a2508227c6a">
                  <h4 class="svadmin-u-76067d04e222 svadmin-u-69450ef1487e uppercase svadmin-u-08cc9b1d44f8 svadmin-u-bfa603190748">Data providers ({dataProviders.length})</h4>
                  {#each dataProviders as provider (provider.name)}
                    <div class="svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-0b91436debbd svadmin-u-03b4dd7f172b">
                      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4">
                        <span class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{provider.name}</span>
                        <Badge variant="outline">{provider.resourceCount} resources</Badge>
                      </div>
                      <div class="svadmin-u-b6b02c0ebef6 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-76067d04e222 svadmin-u-bfa603190748">
                        <span>{provider.capabilities}</span>
                        <span>Endpoint hidden</span>
                      </div>
                    </div>
                  {/each}
                </section>

                <Separator />

                <section class="svadmin-u-da7c36cd8867">
                  <h4 class="svadmin-u-76067d04e222 svadmin-u-69450ef1487e uppercase svadmin-u-08cc9b1d44f8 svadmin-u-bfa603190748">Framework providers</h4>
                  {#each frameworkProviders as provider (provider.name)}
                    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-1004c0c3954c svadmin-u-07389a777c1f svadmin-u-d8e0e382c67b svadmin-u-660d2effb880 svadmin-u-39f703dbe296">
                      <div class="svadmin-u-7e0b7cdf1a94">
                        <div class="svadmin-u-359090c2d529 svadmin-u-d4108abe6359">{provider.name}</div>
                        <div class="svadmin-u-f283ea9bea0e svadmin-u-76067d04e222 svadmin-u-bfa603190748">{provider.capabilities}</div>
                      </div>
                      <Badge variant={provider.configured ? 'secondary' : 'outline'}>{provider.configured ? 'configured' : 'fallback'}</Badge>
                    </div>
                  {/each}
                </section>
              </div>
            </ScrollArea>
          </Tabs.Content>

          <Tabs.Content value="cache" class="svadmin-u-8a539c7fe216">
            <ScrollArea class="svadmin-u-c6a5b7446421">
              <div class="svadmin-u-f3c543ad5fe9 svadmin-u-1004c0c3954c svadmin-u-eb6e8b881acd svadmin-u-e00ad81645a2">
                <section class="svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-eb6e8b881acd">
                  <div class="svadmin-u-a77ed4d908c0 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc">
                    <h4 class="svadmin-u-359090c2d529 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">Queries</h4>
                    <Badge variant="secondary" data-testid="devtools-query-total">{cacheDiagnostics.queries.total}</Badge>
                  </div>
                  <dl class="svadmin-u-da7c36cd8867 svadmin-u-359090c2d529">
                    <div class="svadmin-u-60fbb7713999 svadmin-u-8ef2268efbbc"><dt class="svadmin-u-bfa603190748">Fetching</dt><dd>{cacheDiagnostics.queries.fetching}</dd></div>
                    <div class="svadmin-u-60fbb7713999 svadmin-u-8ef2268efbbc"><dt class="svadmin-u-bfa603190748">Stale</dt><dd>{cacheDiagnostics.queries.stale}</dd></div>
                    <div class="svadmin-u-60fbb7713999 svadmin-u-8ef2268efbbc"><dt class="svadmin-u-bfa603190748">Errors</dt><dd>{cacheDiagnostics.queries.errors}</dd></div>
                  </dl>
                </section>

                <section class="svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-eb6e8b881acd">
                  <div class="svadmin-u-a77ed4d908c0 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc">
                    <h4 class="svadmin-u-359090c2d529 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">Mutations</h4>
                    <Badge variant="secondary" data-testid="devtools-mutation-total">{cacheDiagnostics.mutations.total}</Badge>
                  </div>
                  <dl class="svadmin-u-da7c36cd8867 svadmin-u-359090c2d529">
                    <div class="svadmin-u-60fbb7713999 svadmin-u-8ef2268efbbc"><dt class="svadmin-u-bfa603190748">Pending</dt><dd>{cacheDiagnostics.mutations.pending}</dd></div>
                    <div class="svadmin-u-60fbb7713999 svadmin-u-8ef2268efbbc"><dt class="svadmin-u-bfa603190748">Paused</dt><dd>{cacheDiagnostics.mutations.paused}</dd></div>
                    <div class="svadmin-u-60fbb7713999 svadmin-u-8ef2268efbbc"><dt class="svadmin-u-bfa603190748">Errors</dt><dd>{cacheDiagnostics.mutations.errors}</dd></div>
                  </dl>
                </section>

                <section class="svadmin-u-5a2508227c6a svadmin-u-d378a2461dc3">
                  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc">
                    <h4 class="svadmin-u-359090c2d529 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">Safe query operations</h4>
                    <span class="svadmin-u-76067d04e222 svadmin-u-bfa603190748">IDs, tenant and params hidden</span>
                  </div>
                  {#if safeQueryDiagnostics.length === 0}
                    <div class="svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-0b91436debbd svadmin-u-03b4dd7f172b svadmin-u-76067d04e222 svadmin-u-bfa603190748">
                      No Query Key v2 operations in cache.
                    </div>
                  {:else}
                    {#each safeQueryDiagnostics as query, index (`${query.provider}:${query.resource}:${query.operation}:${index}`)}
                      <div class="svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-0b91436debbd svadmin-u-03b4dd7f172b" data-testid="devtools-query-operation">
                        <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-359090c2d529">
                          <span class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{query.provider} · {query.resource}</span>
                          <Badge variant="outline">{query.operation}</Badge>
                        </div>
                        <dl class="svadmin-u-b6b02c0ebef6 svadmin-u-f3c543ad5fe9 svadmin-u-931228bbb579 svadmin-u-77a2a20e90d4 svadmin-u-76067d04e222 svadmin-u-bfa603190748">
                          <div><dt>Status</dt><dd class="svadmin-u-d4108abe6359">{query.status}</dd></div>
                          <div><dt>Retries</dt><dd class="svadmin-u-d4108abe6359">{query.retries}</dd></div>
                          <div><dt>Duration</dt><dd class="svadmin-u-d4108abe6359">{query.duration}</dd></div>
                          <div><dt>Cache age</dt><dd class="svadmin-u-d4108abe6359">{query.cacheAge}</dd></div>
                          <div><dt>Invalidation</dt><dd class="svadmin-u-d4108abe6359">{query.invalidation}</dd></div>
                        </dl>
                      </div>
                    {/each}
                  {/if}
                </section>

                <p class="svadmin-u-76067d04e222 svadmin-u-bfa603190748 svadmin-u-d378a2461dc3">
                  Query keys, variables, cached records, mutation payloads, and error bodies are intentionally hidden.
                </p>
              </div>
            </ScrollArea>
          </Tabs.Content>

          <Tabs.Content value="inferencer" class="svadmin-u-8a539c7fe216">
            <InferencerPanel />
          </Tabs.Content>

          <Tabs.Content value="selfhealing" class="svadmin-u-8a539c7fe216">
            <ScrollArea class="svadmin-u-c6a5b7446421">
              <div class="svadmin-u-7660b450905a svadmin-u-da7c36cd8867">
                <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-359090c2d529">
                  <div>
                    <h4 class="svadmin-u-76067d04e222 svadmin-u-69450ef1487e uppercase svadmin-u-08cc9b1d44f8 svadmin-u-bfa603190748 svadmin-u-65281709dacf">Runtime Self-Healing</h4>
                    <p class="svadmin-u-76067d04e222 svadmin-u-bfa603190748">AI 自动排障诊断报告与一键自愈</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-359090c2d529"
                    onclick={() => {
                      const report = buildSelfHealingReport(appDiagnostics.snapshot.diagnostics);
                      if (navigator?.clipboard?.writeText) {
                        void navigator.clipboard.writeText(report.agentPrompt);
                        showToast('已复制 AI 自愈 Prompt！');
                      }
                    }}
                  >
                    <Copy class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
                    <span>复制自愈 Prompt</span>
                  </Button>
                </div>

                <Separator />

                {#if appDiagnostics.snapshot.diagnostics.filter(d => d.severity === 'error').length === 0}
                  <div class="svadmin-u-60fbb7713999 svadmin-u-da7c36cd8867 svadmin-u-3960ffc248d9 svadmin-u-2472e9b81a97 svadmin-u-421ac2be5045 svadmin-u-bfa603190748">
                    <Check class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 text-green-500" />
                    <p class="svadmin-u-359090c2d529 svadmin-u-d4108abe6359">当前应用状态健康，无未解决异常</p>
                    <p class="svadmin-u-76067d04e222 svadmin-u-bfa603190748">Provider 与资源契约已正确绑定</p>
                  </div>
                {:else}
                  <div class="svadmin-u-da7c36cd8867">
                    {#each appDiagnostics.snapshot.diagnostics.filter(d => d.severity === 'error') as diag}
                      <div class="svadmin-u-ed8a5df7b2fb svadmin-u-6ee2d41e2d2d svadmin-u-359090c2d529">
                        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-359090c2d529 svadmin-u-e83a7042bc91 font-semibold">
                          <AlertCircle class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 text-destructive" />
                          <span>[{diag.fix?.kind ?? 'ERROR'}] {diag.code}</span>
                        </div>
                        <p class="svadmin-u-76067d04e222 font-mono svadmin-u-bfa603190748">{diag.message}</p>
                        {#if diag.fix?.input?.suggestedAction}
                          <p class="svadmin-u-359090c2d529 svadmin-u-d4108abe6359">💡 建议修复：{diag.fix.input.suggestedAction}</p>
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
      class="{docked ? 'svadmin-u-d89972fe17d6 svadmin-u-421ac2be5045 svadmin-u-438b2237b8d6' : 'svadmin-u-7bc555991dba svadmin-u-6c32e8173349 svadmin-u-24546591650c svadmin-u-ac204c108886 svadmin-u-06bbb43166db svadmin-u-319548b23f75 svadmin-u-c4b15df0fe95'} svadmin-u-f50571addf44 svadmin-u-e7a768f922d2 svadmin-u-ae2181c7b10f svadmin-u-f2868c227fcd svadmin-u-5da1d5250e75 svadmin-u-7abf679f0725 svadmin-u-0fe7d7d814d0"
      onclick={toggle}
    >
      <Bug class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
    </TooltipButton>
  {/if}
{/if}
