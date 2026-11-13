<script lang="ts">
  import { untrack } from 'svelte';
  import { Terminal, Play, Copy, Check, CheckCircle2, AlertCircle, Loader2 } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  export interface ApiResponse {
    status: number;
    durationMs: number;
    sizeBytes?: number | undefined;
    data?: unknown | undefined;
    error?: string | undefined;
  }

  export interface ApiPlaygroundProps {
    defaultMethod?: HttpMethod | undefined;
    defaultUrl?: string | undefined;
    defaultHeaders?: Record<string, string> | undefined;
    defaultBody?: string | undefined;
    onrequest?: ((req: {
      method: HttpMethod;
      url: string;
      headers: Record<string, string>;
      body?: string | undefined;
    }) => Promise<ApiResponse> | ApiResponse) | undefined;
    class?: string | undefined;
  }

  let {
    defaultMethod = 'GET',
    defaultUrl = '/api/v1/users?limit=10',
    defaultHeaders = { 'Content-Type': 'application/json', Authorization: 'Bearer sk_live_demo' },
    defaultBody = '',
    onrequest,
    class: className = '',
  }: ApiPlaygroundProps = $props();

  let method = $state<HttpMethod>(untrack(() => defaultMethod));
  let url = $state(untrack(() => defaultUrl));
  let requestBody = $state(untrack(() => defaultBody));
  let isExecuting = $state(false);
  let responseResult = $state<ApiResponse | null>(null);
  let isCurlCopied = $state(false);

  const generatedCurl = $derived.by(() => {
    const parts = [`curl -X ${method} "${url}"`];
    for (const [k, v] of Object.entries(defaultHeaders)) {
      parts.push(`-H "${k}: ${v}"`);
    }
    if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody.trim()) {
      parts.push(`-d '${requestBody.trim()}'`);
    }
    return parts.join(' \\\n  ');
  });

  async function copyCurl() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(generatedCurl);
      isCurlCopied = true;
      setTimeout(() => {
        isCurlCopied = false;
      }, 1500);
    } catch {
      // Ignore
    }
  }

  async function executeRequest() {
    if (!url.trim() || isExecuting) return;
    isExecuting = true;
    responseResult = null;
    const startTime = Date.now();

    try {
      if (onrequest) {
        responseResult = await onrequest({
          method,
          url: url.trim(),
          headers: defaultHeaders,
          body: requestBody || undefined,
        });
      } else {
        // Built-in mock response
        await new Promise((r) => setTimeout(r, 380));
        responseResult = {
          status: 200,
          durationMs: Date.now() - startTime,
          sizeBytes: 1420,
          data: {
            success: true,
            items: [
              { id: 1, name: 'Alice', role: 'admin' },
              { id: 2, name: 'Bob', role: 'operator' },
            ],
            total: 2,
          },
        };
      }
    } catch (err: unknown) {
      responseResult = {
        status: 500,
        durationMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : '接口调用异常中断',
      };
    } finally {
      isExecuting = false;
    }
  }

  function getMethodTone(m: HttpMethod) {
    switch (m) {
      case 'GET':
        return 'text-primary bg-primary/10 border-primary/30';
      case 'POST':
        return 'text-success bg-success/10 border-success/30';
      case 'PUT':
      case 'PATCH':
        return 'text-warning bg-warning/10 border-warning/30';
      case 'DELETE':
        return 'text-destructive bg-destructive/10 border-destructive/30';
      default:
        return 'text-foreground bg-muted border-border';
    }
  }
</script>

<div
  class={cn('rounded-md border border-border bg-card p-5 text-card-foreground shadow-xs space-y-4', className)}
  data-svadmin-component="ApiPlayground"
>
  <header class="flex items-center justify-between border-b border-border pb-3">
    <div class="flex items-center gap-2">
      <Terminal class="h-4 w-4 text-primary" />
      <h3 class="font-bold text-sm text-foreground">API 快捷调试工作台</h3>
    </div>
    <span class="text-xs font-mono text-muted-foreground">内嵌式接口探针</span>
  </header>

  <!-- URL Request Bar -->
  <div class="flex items-center gap-2 text-xs font-mono">
    <!-- Method Selector -->
    <select
      class={cn('svadmin-select svadmin-select--inline font-bold cursor-pointer', getMethodTone(method))}
      bind:value={method}
      disabled={isExecuting}
    >
      <option value="GET">GET</option>
      <option value="POST">POST</option>
      <option value="PUT">PUT</option>
      <option value="PATCH">PATCH</option>
      <option value="DELETE">DELETE</option>
    </select>

    <!-- URL Input -->
    <input
      type="text"
      class="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
      bind:value={url}
      placeholder="/api/v1/..."
      disabled={isExecuting}
    />

    <!-- Send Button -->
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
      onclick={executeRequest}
      disabled={isExecuting || !url.trim()}
    >
      {#if isExecuting}
        <Loader2 class="h-3.5 w-3.5 animate-spin" />
        <span>请求中...</span>
      {:else}
        <Play class="h-3.5 w-3.5 fill-current" />
        <span>发送请求</span>
      {/if}
    </button>
  </div>

  <!-- Request Body (for POST/PUT/PATCH) -->
  {#if ['POST', 'PUT', 'PATCH'].includes(method)}
    <div class="space-y-1 text-xs">
      <label for="api-request-body" class="block font-medium text-foreground font-mono">
        请求正文 (Request Body JSON)
      </label>
      <textarea
        id="api-request-body"
        class="w-full h-24 rounded-md border border-input bg-background p-3 font-mono text-xs leading-relaxed text-foreground outline-none focus:ring-1 focus:ring-primary"
        bind:value={requestBody}
        placeholder="输入 JSON 正文..."
      ></textarea>
    </div>
  {/if}

  <!-- Generated cURL preview box -->
  <div class="rounded-md border border-border bg-muted/20 p-3 space-y-2 text-xs font-mono">
    <div class="flex items-center justify-between text-muted-foreground">
      <span class="font-bold text-foreground">一键生成标准终端 cURL 命令</span>
      <button
        type="button"
        class="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer"
        onclick={copyCurl}
      >
        {#if isCurlCopied}
          <Check class="h-3 w-3 text-success" />
          <span class="text-success font-semibold">已复制 cURL</span>
        {:else}
          <Copy class="h-3 w-3" />
          <span>复制 cURL</span>
        {/if}
      </button>
    </div>
    <pre class="rounded border border-border bg-card p-2 text-foreground whitespace-pre-wrap select-all"><code>{generatedCurl}</code></pre>
  </div>

  <!-- Response Section -->
  {#if responseResult}
    <div class="rounded-md border border-border bg-card p-4 space-y-3 text-xs font-mono">
      <div class="flex items-center justify-between border-b border-border pb-2">
        <div class="flex items-center gap-2">
          {#if responseResult.status >= 200 && responseResult.status < 300}
            <span class="font-bold text-success flex items-center gap-1">
              <CheckCircle2 class="h-3.5 w-3.5" />
              HTTP {responseResult.status} OK
            </span>
          {:else}
            <span class="font-bold text-destructive flex items-center gap-1">
              <AlertCircle class="h-3.5 w-3.5" />
              HTTP {responseResult.status} ERROR
            </span>
          {/if}
        </div>
        <div class="flex items-center gap-3 text-muted-foreground">
          <span>耗时: <strong>{responseResult.durationMs}ms</strong></span>
          {#if responseResult.sizeBytes}
            <span>大小: <strong>{responseResult.sizeBytes} B</strong></span>
          {/if}
        </div>
      </div>

      {#if responseResult.error}
        <div class="text-destructive font-semibold">
          异常报错: {responseResult.error}
        </div>
      {:else if responseResult.data}
        <div>
          <span class="text-muted-foreground block mb-1">响应结果数据 (JSON):</span>
          <pre class="rounded border border-border bg-muted/30 p-2.5 text-foreground max-h-48 overflow-y-auto whitespace-pre-wrap"><code>{JSON.stringify(responseResult.data, null, 2)}</code></pre>
        </div>
      {/if}
    </div>
  {/if}
</div>
