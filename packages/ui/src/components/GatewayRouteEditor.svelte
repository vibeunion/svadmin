<script lang="ts">
  import {
    Network,
    Plus,
    Trash2,
    Check,
    Play,
    Split,
    ArrowRight,
    Sliders,
    Server,
    FileCode,
    Sparkles,
    CheckCircle2,
    XCircle,
    Info,
  } from 'lucide-svelte';

  export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | 'ALL';

  export interface HeaderMatchRule {
    id: string;
    name: string;
    value: string;
    op: 'exact' | 'regex' | 'prefix';
  }

  export interface GatewayRouteConfig {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    pathPattern: string;
    matchType: 'prefix' | 'exact' | 'regex';
    methods: HttpMethod[];
    headers: HeaderMatchRule[];
    upstreamUrl: string;
    stripPrefix: boolean;
    rewritePrefix?: string;
    canaryEnabled: boolean;
    canaryUpstreamUrl?: string;
    canaryWeight: number; // 0 to 100
  }

  interface Props {
    route?: GatewayRouteConfig;
    title?: string;
    subtitle?: string;
    onsave?: (route: GatewayRouteConfig) => void;
    ontest?: (testPath: string) => boolean | Promise<boolean>;
    ondelete?: () => void;
  }

  const defaultRoute: GatewayRouteConfig = {
    id: 'route-user-service-01',
    name: '用户微服务核心路由规则',
    description: '负责分发移动端与 Web 端用户档案、权限鉴权与组织架构调用',
    enabled: true,
    pathPattern: '/api/v1/users/**',
    matchType: 'prefix',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    headers: [
      { id: 'h-1', name: 'X-Tenant-ID', value: 'tenant-*', op: 'prefix' },
    ],
    upstreamUrl: 'http://user-service-cluster.internal:8080',
    stripPrefix: true,
    rewritePrefix: '/internal/users',
    canaryEnabled: true,
    canaryUpstreamUrl: 'http://user-service-canary.internal:8080',
    canaryWeight: 15,
  };

  let {
    route = defaultRoute,
    title = '微服务 API 网关路由编排',
    subtitle = '配置端点路径匹配、目标微服务集群分发与金丝雀灰度流量分流',
    onsave,
    ontest,
    ondelete,
  }: Props = $props();

  let currentRoute = $state<GatewayRouteConfig>({ ...route });
  let testInputPath = $state('/api/v1/users/profile');
  let testResult = $state<{ matched: boolean; targetUpstream: string; message: string } | null>(null);
  let isTesting = $state(false);
  let saveSuccess = $state(false);

  const availableMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];

  function toggleMethod(method: HttpMethod) {
    if (currentRoute.methods.includes(method)) {
      currentRoute.methods = currentRoute.methods.filter((m) => m !== method);
    } else {
      currentRoute.methods = [...currentRoute.methods, method];
    }
  }

  function addHeaderRule() {
    const newHeader: HeaderMatchRule = {
      id: `h-${Date.now()}`,
      name: '',
      value: '',
      op: 'exact',
    };
    currentRoute.headers = [...currentRoute.headers, newHeader];
  }

  function removeHeaderRule(id: string) {
    currentRoute.headers = currentRoute.headers.filter((h) => h.id !== id);
  }

  async function handleTestMatch() {
    isTesting = true;
    testResult = null;
    try {
      if (ontest) {
        const passed = await ontest(testInputPath);
        testResult = {
          matched: passed,
          targetUpstream: passed ? currentRoute.upstreamUrl : '未命中规则',
          message: passed ? '路径成功匹配规则，正常路由分发' : '路径未能命中当前路由匹配前缀',
        };
      } else {
        // 内置简易正则 / 前缀推演
        let matched = false;
        if (currentRoute.matchType === 'prefix') {
          const prefix = currentRoute.pathPattern.replace(/\/\*\*?$/, '');
          matched = testInputPath.startsWith(prefix);
        } else if (currentRoute.matchType === 'exact') {
          matched = testInputPath === currentRoute.pathPattern;
        } else {
          matched = new RegExp(currentRoute.pathPattern).test(testInputPath);
        }

        testResult = {
          matched,
          targetUpstream: matched
            ? currentRoute.canaryEnabled && currentRoute.canaryWeight > 0
              ? `${currentRoute.upstreamUrl} (${100 - currentRoute.canaryWeight}%) / ${currentRoute.canaryUpstreamUrl || ''} (${currentRoute.canaryWeight}%)`
              : currentRoute.upstreamUrl
            : '无可用上游',
          message: matched ? '测试路径与规则匹配成功！' : '路径未满足前缀或模式匹配要求',
        };
      }
    } finally {
      isTesting = false;
    }
  }

  function handleSave() {
    if (onsave) {
      onsave(currentRoute);
    }
    saveSuccess = true;
    setTimeout(() => {
      saveSuccess = false;
    }, 2000);
  }
</script>

<div
  class="relative rounded-xl border border-border bg-card p-6 shadow-lg transition-all"
  data-svadmin-component="GatewayRouteEditor"
>
  <!-- Header Title & Status -->
  <div class="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-border">
    <div class="flex items-center gap-3">
      <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
        <Network class="h-6 w-6" />
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-base font-semibold text-foreground tracking-tight">{title}</h2>
          <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
            {currentRoute.enabled ? 'bg-success/15 text-success border border-success/30' : 'bg-muted text-muted-foreground'}">
            {currentRoute.enabled ? '规则已生效' : '规则已禁用'}
          </span>
        </div>
        <p class="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <label class="relative inline-flex items-center cursor-pointer mr-2">
        <input
          type="checkbox"
          class="sr-only peer"
          checked={currentRoute.enabled}
          onchange={(e) => currentRoute.enabled = (e.target as HTMLInputElement).checked}
        />
        <div class="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
        <span class="ml-2 text-xs font-medium text-foreground">路由启用</span>
      </label>

      {#if ondelete}
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
          onclick={ondelete}
        >
          <Trash2 class="h-3.5 w-3.5" />
          <span>删除路由</span>
        </button>
      {/if}

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        onclick={handleSave}
      >
        {#if saveSuccess}
          <Check class="h-3.5 w-3.5 text-primary-foreground" />
          <span>已保存配置</span>
        {:else}
          <span>保存路由配置</span>
        {/if}
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
    <!-- Left Column: Match Rules -->
    <div class="space-y-5">
      <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sliders class="h-4 w-4 text-primary" />
        <span>请求入口匹配条件</span>
      </div>

      <!-- Route Name & ID -->
      <div class="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label for="gateway-route-name" class="block font-medium text-muted-foreground mb-1">路由名称</label>
          <input
            id="gateway-route-name"
            type="text"
            class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            bind:value={currentRoute.name}
          />
        </div>
        <div>
          <label for="gateway-route-id" class="block font-medium text-muted-foreground mb-1">路由唯一标识 (ID)</label>
          <input
            id="gateway-route-id"
            type="text"
            class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono text-muted-foreground"
            bind:value={currentRoute.id}
          />
        </div>
      </div>

      <!-- Path Match Pattern -->
      <div class="text-xs space-y-1.5">
        <label for="gateway-path-pattern" class="block font-medium text-muted-foreground">路径匹配模式 (URI Pattern)</label>
        <div class="flex gap-2">
          <select
            class="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            bind:value={currentRoute.matchType}
          >
            <option value="prefix">前缀匹配 (Prefix)</option>
            <option value="exact">精确匹配 (Exact)</option>
            <option value="regex">正则表达式 (Regex)</option>
          </select>
          <input
            id="gateway-path-pattern"
            type="text"
            class="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="/api/v1/resource/**"
            bind:value={currentRoute.pathPattern}
          />
        </div>
      </div>

      <!-- HTTP Methods -->
      <div class="text-xs space-y-2">
        <span class="block font-medium text-muted-foreground">允许 HTTP 方法</span>
        <div class="flex flex-wrap gap-1.5">
          {#each availableMethods as method}
            <button
              type="button"
              class="rounded-md px-2.5 py-1 text-[11px] font-mono font-semibold transition-colors
                {currentRoute.methods.includes(method)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'}"
              onclick={() => toggleMethod(method)}
            >
              {method}
            </button>
          {/each}
        </div>
      </div>

      <!-- Header Matching Criteria -->
      <div class="text-xs space-y-2">
        <div class="flex items-center justify-between">
          <span class="font-medium text-muted-foreground">请求头 Header 限制过滤</span>
          <button
            type="button"
            class="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            onclick={addHeaderRule}
          >
            <Plus class="h-3 w-3" />
            <span>添加 Header 规则</span>
          </button>
        </div>

        {#if currentRoute.headers.length === 0}
          <div class="rounded-lg border border-dashed border-border p-3 text-center text-muted-foreground">
            未配置 Header 限制，所有 HTTP Header 均放行
          </div>
        {:else}
          <div class="space-y-2">
            {#each currentRoute.headers as header}
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Header 键名 (如 X-Tenant-ID)"
                  class="flex-1 rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  bind:value={header.name}
                />
                <input
                  type="text"
                  placeholder="匹配值"
                  class="flex-1 rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  bind:value={header.value}
                />
                <button
                  type="button"
                  class="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                  onclick={() => removeHeaderRule(header.id)}
                  aria-label="移除 Header 规则"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Right Column: Upstream & Canary Traffic -->
    <div class="space-y-5">
      <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Server class="h-4 w-4 text-primary" />
        <span>后端集群与金丝雀灰度分流</span>
      </div>

      <!-- Primary Upstream URL -->
      <div class="text-xs space-y-1.5">
        <label for="gateway-upstream-url" class="block font-medium text-muted-foreground">主目标上游集群 (Primary Target Upstream)</label>
        <input
          id="gateway-upstream-url"
          type="text"
          class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="http://service-cluster.internal:8080"
          bind:value={currentRoute.upstreamUrl}
        />
      </div>

      <!-- Path Rewrite & Strip Prefix -->
      <div class="rounded-lg border border-border bg-muted/20 p-3.5 text-xs space-y-3">
        <div class="flex items-center justify-between">
          <span class="font-medium text-foreground">剥离路径前缀 (Strip Prefix)</span>
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-border text-primary focus:ring-ring"
            bind:checked={currentRoute.stripPrefix}
          />
        </div>
        <div>
          <label for="gateway-rewrite-prefix" class="block text-muted-foreground mb-1">重写转发目标前缀 (Rewrite Path)</label>
          <input
            id="gateway-rewrite-prefix"
            type="text"
            class="w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="/internal/service"
            bind:value={currentRoute.rewritePrefix}
          />
        </div>
      </div>

      <!-- Canary / Gray Release Traffic Slider -->
      <div class="rounded-lg border border-border bg-card p-4 text-xs space-y-3 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 font-semibold text-foreground">
            <Split class="h-3.5 w-3.5 text-primary" />
            <span>金丝雀 (Canary) 灰度权重分配</span>
          </div>
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-border text-primary focus:ring-ring"
            bind:checked={currentRoute.canaryEnabled}
          />
        </div>

        {#if currentRoute.canaryEnabled}
          <div class="space-y-3 pt-1">
            <div>
              <label for="gateway-canary-url" class="block text-muted-foreground mb-1">灰度集群地址</label>
              <input
                id="gateway-canary-url"
                type="text"
                class="w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="http://service-canary.internal:8080"
                bind:value={currentRoute.canaryUpstreamUrl}
              />
            </div>

            <div>
              <div class="flex justify-between text-muted-foreground mb-1">
                <span>稳定主版本: <strong class="text-foreground">{100 - currentRoute.canaryWeight}%</strong></span>
                <span>金丝雀版本: <strong class="text-primary">{currentRoute.canaryWeight}%</strong></span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                class="w-full accent-primary cursor-pointer"
                bind:value={currentRoute.canaryWeight}
              />
            </div>
          </div>
        {/if}
      </div>

      <!-- Route Test Sandbox -->
      <div class="rounded-lg border border-border bg-muted/30 p-3.5 text-xs space-y-2.5">
        <span class="font-semibold text-foreground">路由规则沙箱测试 (Sandbox Matcher)</span>
        <div class="flex gap-2">
          <input
            type="text"
            class="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="/api/v1/users/123"
            bind:value={testInputPath}
          />
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
            onclick={handleTestMatch}
            disabled={isTesting}
          >
            <Play class="h-3 w-3" />
            <span>执行推演</span>
          </button>
        </div>

        {#if testResult}
          <div class="rounded-md p-2.5 text-xs border
            {testResult.matched ? 'bg-success/10 border-success/30 text-success' : 'bg-destructive/10 border-destructive/30 text-destructive'}">
            <div class="flex items-center gap-1.5 font-semibold">
              {#if testResult.matched}
                <CheckCircle2 class="h-3.5 w-3.5" />
              {:else}
                <XCircle class="h-3.5 w-3.5" />
              {/if}
              <span>{testResult.message}</span>
            </div>
            <div class="mt-1 font-mono text-[11px] opacity-90">
              目标集群：{testResult.targetUpstream}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
