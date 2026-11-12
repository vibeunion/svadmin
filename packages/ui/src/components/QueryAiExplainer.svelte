<script lang="ts">
  import { untrack } from 'svelte';
  import { Sparkles, Copy, Check, RefreshCw, Code2, BookOpen } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface QueryAiExplainerProps {
    /** 待解析的原始 SQL / 复杂表达式 */
    queryText: string;
    /** 数据表或业务实体名称，如 "订单中心财务流水" */
    contextName?: string | undefined;
    /** 外部直接传入的已解析业务解释 */
    explanation?: string | undefined;
    /** 是否正在调用 AI 解释中 */
    loading?: boolean | undefined;
    /** 点击重新请求 AI 解析回调 */
    onexplain?: ((query: string) => Promise<string> | string) | undefined;
    class?: string | undefined;
  }

  let {
    queryText,
    contextName = '业务数据表',
    explanation,
    loading = false,
    onexplain,
    class: className = '',
  }: QueryAiExplainerProps = $props();

  let isCopied = $state(false);
  let localExplaining = $state(false);
  let resolvedExplanation = $state(untrack(() => explanation ?? ''));

  function generateDefaultExplanation(raw: string): string {
    const lines = [
      `本规则作用于【${contextName}】，核心业务约束如下：`,
    ];
    if (raw.toLowerCase().includes('and')) {
      lines.push('• 必须同时满足多个条件约束（交集逻辑）');
    }
    if (raw.toLowerCase().includes('or')) {
      lines.push('• 包含可替代的跨分支匹配范围（并集逻辑）');
    }
    if (raw.toLowerCase().includes('>') || raw.toLowerCase().includes('=')) {
      lines.push('• 包含精准数值或状态过滤约束');
    }
    lines.push('符合上述全部条件的数据才会呈现在最终报表视图中。');
    return lines.join('\n');
  }

  const activeExplanation = $derived(
    resolvedExplanation || explanation || generateDefaultExplanation(queryText)
  );

  async function handleExplainClick() {
    if (localExplaining || loading) return;
    localExplaining = true;
    try {
      if (onexplain) {
        resolvedExplanation = await onexplain(queryText);
      } else {
        await new Promise((r) => setTimeout(r, 600));
        resolvedExplanation = generateDefaultExplanation(queryText);
      }
    } finally {
      localExplaining = false;
    }
  }

  async function copyExplanation() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(activeExplanation);
      isCopied = true;
      setTimeout(() => {
        isCopied = false;
      }, 1500);
    } catch {
      // Ignore
    }
  }
</script>

<div
  class={cn('rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs space-y-4', className)}
  data-svadmin-component="QueryAiExplainer"
>
  <!-- Header -->
  <header class="flex items-center justify-between border-b border-border pb-3">
    <div class="flex items-center gap-2">
      <div class="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Sparkles class="h-4 w-4" />
      </div>
      <div>
        <h3 class="font-bold text-sm text-foreground">AI 规则语义解释卡片</h3>
        <p class="text-[11px] text-muted-foreground">将复杂技术表达式一键转写为通俗业务规则</p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        onclick={handleExplainClick}
        disabled={localExplaining || loading}
      >
        <RefreshCw class={cn('h-3 w-3', (localExplaining || loading) && 'animate-spin text-primary')} />
        <span>重新解析</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        onclick={copyExplanation}
      >
        {#if isCopied}
          <Check class="h-3 w-3 text-success" />
          <span class="text-success font-semibold">已复制</span>
        {:else}
          <Copy class="h-3 w-3" />
          <span>复制说明</span>
        {/if}
      </button>
    </div>
  </header>

  <!-- Code Preview -->
  <div class="space-y-1.5 text-xs font-mono">
    <div class="flex items-center justify-between text-muted-foreground">
      <span class="font-medium text-foreground flex items-center gap-1 font-sans">
        <Code2 class="h-3.5 w-3.5 text-primary" />
        原始规则表达式:
      </span>
      <span class="text-[10px] opacity-75">SQL / Rule Tree</span>
    </div>
    <pre class="rounded-lg border border-border bg-muted/20 p-3 text-foreground whitespace-pre-wrap break-all"><code>{queryText}</code></pre>
  </div>

  <!-- AI Explanation Box -->
  <div class="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2 text-xs">
    <div class="flex items-center gap-1.5 text-primary font-bold">
      <BookOpen class="h-4 w-4" />
      <span>业务通俗口径解释：</span>
    </div>
    <div class="text-foreground leading-relaxed whitespace-pre-wrap pl-1 font-sans">
      {activeExplanation}
    </div>
  </div>
</div>
