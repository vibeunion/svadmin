<script lang="ts">
  import { untrack } from 'svelte';
  import {
    Compass,
    ArrowLeft,
    Check,
    Copy,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export interface MicroAppRouteSyncProps {
    hostBaseUrl?: string | undefined;
    queryKey?: string | undefined;
    initialRoute?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    class?: string | undefined;
    onRouteChange?: ((route: string, syncedUrl: string) => void) | undefined;
  }

  let {
    hostBaseUrl = 'https://admin.example.com/portal/bi-workspace',
    queryKey = 'subAppRoute',
    initialRoute = '/reports/quarterly-gmv/details',
    title = '微前端父子应用路由双向无感同步器 (Route Sync)',
    description = '实时协调宿主浏览器 URL 与子应用内部单页路由，消除页面刷新 404 与前进后退断裂',
    class: className = '',
    onRouteChange,
  }: MicroAppRouteSyncProps = $props();

  let currentSubRoute = $state(untrack(() => initialRoute));
  let routeHistory = $state<string[]>([
    '/reports/overview',
    '/reports/quarterly-gmv',
    untrack(() => initialRoute),
  ]);
  let copied = $state(false);

  let syncedHostUrl = $derived(
    `${hostBaseUrl}?${queryKey}=${encodeURIComponent(currentSubRoute)}`
  );

  function navigateTo(targetRoute: string) {
    currentSubRoute = targetRoute;
    if (!routeHistory.includes(targetRoute)) {
      routeHistory = [...routeHistory, targetRoute];
    }
    onRouteChange?.(currentSubRoute, syncedHostUrl);
  }

  function handleBack() {
    const idx = routeHistory.indexOf(currentSubRoute);
    if (idx > 0) {
      const prev = routeHistory[idx - 1];
      if (prev) {
        currentSubRoute = prev;
        onRouteChange?.(currentSubRoute, syncedHostUrl);
      }
    }
  }

  function copyUrl() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(syncedHostUrl);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    }
  }
</script>

<div
  class={cn('w-full rounded-2xl border border-border bg-card text-foreground shadow-sm flex flex-col p-5 gap-4', className)}
  data-svadmin-component="micro-app-route-sync"
>
  <!-- 头部控制栏 -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div class="flex items-center gap-2.5">
      <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
        <Compass class="w-4 h-4" />
      </div>
      <div>
        <h3 class="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
        <p class="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>

    <!-- 状态指示 -->
    <div class="flex items-center gap-1.5 text-xs text-success font-medium bg-success/10 border border-success/20 px-2.5 py-1 rounded-full">
      <Check class="w-3.5 h-3.5" />
      <span>双向 PopState 监听正常</span>
    </div>
  </div>

  <!-- 双向映射可视化卡片 -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    <!-- 子应用内部路径 -->
    <div class="p-3.5 rounded-xl border border-border bg-muted/20 flex flex-col gap-1.5">
      <div class="flex items-center justify-between text-xs">
        <span class="text-muted-foreground font-medium">子应用单页路由 (Internal SubApp Path):</span>
        <span class="text-[10px] px-1.5 py-0.2 rounded bg-muted border border-border font-mono text-primary">
          Active
        </span>
      </div>

      <div class="flex items-center gap-2">
        <input
          type="text"
          bind:value={currentSubRoute}
          class="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button
          variant="outline"
          size="sm"
          class="h-8 text-xs shrink-0"
          onclick={() => navigateTo(currentSubRoute)}
        >
          推送跳转
        </Button>
      </div>
    </div>

    <!-- 宿主浏览器同步映射 URL -->
    <div class="p-3.5 rounded-xl border border-border bg-muted/20 flex flex-col gap-1.5">
      <div class="flex items-center justify-between text-xs">
        <span class="text-muted-foreground font-medium">宿主浏览器地址栏同步映射 (Host URL):</span>
        <button
          type="button"
          class="flex items-center gap-1 text-[11px] text-primary hover:underline"
          onclick={copyUrl}
        >
          {#if copied}
            <Check class="w-3 h-3 text-success" />
            <span>已复制</span>
          {:else}
            <Copy class="w-3 h-3" />
            <span>复制 URL</span>
          {/if}
        </button>
      </div>

      <div class="p-2 rounded-lg border border-border bg-card font-mono text-[11px] text-foreground truncate select-all">
        {syncedHostUrl}
      </div>
    </div>
  </div>

  <!-- 历史前进/后退与快捷直达 -->
  <div class="p-3 rounded-xl border border-border bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
    <div class="flex items-center gap-2 w-full sm:w-auto">
      <Button
        variant="outline"
        size="sm"
        class="h-7 text-xs gap-1"
        disabled={routeHistory.indexOf(currentSubRoute) <= 0}
        onclick={handleBack}
      >
        <ArrowLeft class="w-3 h-3" />
        <span>浏览器后退仿真</span>
      </Button>

      <span class="text-muted-foreground text-[11px]">快捷路由栈:</span>
      <div class="flex items-center gap-1 flex-wrap">
        {#each routeHistory as route (route)}
          <button
            type="button"
            class={cn(
              'px-2 py-0.5 rounded font-mono text-[10px] transition-colors',
              route === currentSubRoute
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
            onclick={() => navigateTo(route)}
          >
            {route}
          </button>
        {/each}
      </div>
    </div>

    <span class="text-[11px] text-muted-foreground shrink-0">
      页面刷新自动恢复子应用深层路径
    </span>
  </div>
</div>
