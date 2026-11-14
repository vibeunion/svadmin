<script lang="ts">
  import {
    Layers,
    RotateCcw,
    ExternalLink,
    AlertTriangle,
    CheckCircle2,
    Shield,
    Activity,
    Maximize2,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export interface MicroAppSandboxProps {
    src?: string | undefined;
    appName?: string | undefined;
    appId?: string | undefined;
    token?: string | undefined;
    theme?: 'light' | 'dark' | 'system' | undefined;
    locale?: string | undefined;
    height?: string | number | undefined;
    class?: string | undefined;
    onLoad?: (() => void) | undefined;
    onError?: ((error: string) => void) | undefined;
    onReload?: (() => void) | undefined;
  }

  let {
    src = 'https://sub-bi.example.internal/embed',
    appName = '企业商业智能 (BI) 报表子应用',
    appId = 'app-bi-micro-01',
    token = 'Bearer subapp-mock-jwt-token-9821',
    theme = 'dark',
    locale = 'zh-CN',
    height = 420,
    class: className = '',
    onLoad,
    onError,
    onReload,
  }: MicroAppSandboxProps = $props();

  let status = $state<'loading' | 'ready' | 'error'>('ready');
  let errorMessage = $state<string | null>(null);
  let isFullscreen = $state(false);

  function handleReload() {
    status = 'loading';
    errorMessage = null;
    onReload?.();
    setTimeout(() => {
      status = 'ready';
      onLoad?.();
    }, 600);
  }

  function simulateCrash() {
    status = 'error';
    errorMessage = '子应用渲染进程未响应 (Script Execution Timeout / Error 502)';
    onError?.(errorMessage);
  }
</script>

<div
  class={cn(
    'w-full rounded-2xl border border-border bg-card text-foreground shadow-sm flex flex-col overflow-hidden transition-all duration-200',
    isFullscreen && 'fixed inset-4 z-50 shadow-2xl',
    className
  )}
  data-svadmin-component="micro-app-sandbox"
>
  <!-- 沙箱顶栏控制条 -->
  <div class="px-4 py-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
        <Layers class="w-4 h-4" />
      </div>

      <div class="flex flex-col min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-foreground truncate">{appName}</span>
          <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border shrink-0">
            {appId}
          </span>
        </div>
        <span class="text-[10px] text-muted-foreground truncate">
          安全沙箱源: {src} · 语言: {locale} · 主题: {theme}
        </span>
      </div>
    </div>

    <!-- 运行状态指示与动作按钮 -->
    <div class="flex items-center gap-2 shrink-0">
      {#if status === 'ready'}
        <span class="flex items-center gap-1 text-[11px] text-success font-medium px-2 py-0.5 rounded-full bg-success/10 border border-success/20">
          <CheckCircle2 class="w-3 h-3" />
          运行健康 (Mounted)
        </span>
      {:else if status === 'loading'}
        <span class="flex items-center gap-1 text-[11px] text-info font-medium px-2 py-0.5 rounded-full bg-info/10 border border-info/20">
          <Activity class="w-3 h-3 animate-spin" />
          沙箱初始化...
        </span>
      {:else}
        <span class="flex items-center gap-1 text-[11px] text-destructive font-medium px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/20">
          <AlertTriangle class="w-3 h-3" />
          沙箱异常拦截
        </span>
      {/if}

      <div class="flex items-center gap-1 border-l border-border/60 pl-2">
        <button
          type="button"
          class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="重新加载沙箱"
          onclick={handleReload}
        >
          <RotateCcw class="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={isFullscreen ? '退出全屏' : '全屏沙箱'}
          onclick={() => (isFullscreen = !isFullscreen)}
        >
          <Maximize2 class="w-3.5 h-3.5" />
        </button>

        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="独立窗口打开"
        >
          <ExternalLink class="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  </div>

  <!-- 沙箱主体视窗 -->
  <div
    class="relative w-full bg-muted/10 flex flex-col justify-center overflow-hidden"
    style="height: {typeof height === 'number' ? `${height}px` : height};"
  >
    {#if status === 'loading'}
      <!-- 加载过渡态骨架 -->
      <div class="p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Activity class="w-8 h-8 text-primary animate-spin" />
        <div class="text-xs">正在向子应用注入登录令牌与安全样式表…</div>
      </div>
    {:else if status === 'error'}
      <!-- 异常崩溃容灾降级面板 -->
      <div class="p-8 flex flex-col items-center justify-center text-center max-w-md mx-auto gap-3">
        <div class="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center">
          <AlertTriangle class="w-6 h-6" />
        </div>
        <div>
          <h4 class="text-sm font-semibold text-foreground">子应用隔离拦截与崩溃保护</h4>
          <p class="text-xs text-muted-foreground mt-1">{errorMessage}</p>
        </div>
        <div class="flex items-center gap-2 mt-2">
          <Button variant="outline" size="sm" class="h-8 text-xs" onclick={handleReload}>
            <RotateCcw class="w-3.5 h-3.5 mr-1" />
            尝试自愈重启
          </Button>
        </div>
      </div>
    {:else}
      <!-- 模拟/真实 沙箱视图 -->
      <div class="w-full h-full p-4 flex flex-col justify-between">
        <div class="p-4 rounded-xl border border-border bg-card flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-foreground">微前端隔离沙箱运行时 (Shadow DOM / iframe Guard)</span>
            <span class="text-[10px] text-muted-foreground font-mono">Token 已就绪: {token.slice(0, 16)}...</span>
          </div>
          <p class="text-[11px] text-muted-foreground leading-relaxed">
            宿主与子应用已建立受信任的跨域事件通道。子应用的 CSS 样式与全局 window 作用域完全隔离，不污染宿主管理平台全局规范。
          </p>
        </div>

        <div class="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/40">
          <span class="flex items-center gap-1">
            <Shield class="w-3 h-3 text-primary" />
            Sandbox Isolation Level: Strict (allow-scripts, allow-same-origin, allow-forms)
          </span>
          <button
            type="button"
            class="text-[10px] text-muted-foreground hover:text-destructive underline"
            onclick={simulateCrash}
          >
            测试异常容灾兜底
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
