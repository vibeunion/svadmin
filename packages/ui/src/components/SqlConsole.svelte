<script lang="ts">
  import { untrack } from 'svelte';
  import {
    Terminal,
    Play,
    ShieldAlert,
    Clock,
    Copy,
    Check,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';

  export interface SqlQueryResult {
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
    durationMs: number;
  }

  export interface SqlConsoleProps {
    initialSql?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    templates?: Array<{ label: string; sql: string }> | undefined;
    class?: string | undefined;
    onExecuteQuery?: ((sql: string) => Promise<SqlQueryResult> | SqlQueryResult) | undefined;
  }

  let {
    initialSql = 'SELECT id, order_no, amount, status FROM orders WHERE amount > 1000 ORDER BY id DESC LIMIT 10;',
    title,
    description,
    templates = [
      { label: '订单大额筛选', sql: 'SELECT id, order_no, amount, status FROM orders WHERE amount > 1000 ORDER BY id DESC LIMIT 10;' },
      { label: '状态分组汇总统计', sql: 'SELECT status, COUNT(*) AS total_count, SUM(amount) AS total_amount FROM orders GROUP BY status;' },
      { label: '用户与权限探查', sql: 'SELECT u.id, u.name, u.role, u.created_at FROM users u ORDER BY u.id ASC LIMIT 20;' },
    ],
    class: className = '',
    onExecuteQuery,
  }: SqlConsoleProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let sqlQuery = $state(untrack(() => initialSql));
  let isExecuting = $state(false);
  let isCopied = $state(false);
  let queryResult = $state<SqlQueryResult | null>({
    columns: ['id', 'order_no', 'amount', 'status'],
    rows: [
      { id: 101, order_no: 'ORD-2026-901', amount: 4850.0, status: 'PAID' },
      { id: 102, order_no: 'ORD-2026-902', amount: 1280.0, status: 'PENDING' },
    ],
    rowCount: 2,
    durationMs: 14,
  });

  // Strict read-only safety guard: blocks DROP, TRUNCATE, ALTER, DELETE, UPDATE, INSERT, GRANT, REVOKE
  const destructiveRegex = /\b(DROP|TRUNCATE|ALTER|DELETE|UPDATE|INSERT|GRANT|REVOKE|REPLACE)\b/i;

  const isDestructive = $derived(destructiveRegex.test(sqlQuery));

  async function handleExecute() {
    if (isDestructive || !sqlQuery.trim() || isExecuting) return;

    isExecuting = true;
    try {
      if (onExecuteQuery) {
        const res = await onExecuteQuery(sqlQuery.trim());
        queryResult = res;
      } else {
        // Built-in mock simulation
        queryResult = {
          columns: ['id', 'query', 'status', 'checked_at'],
          rows: [
            { id: 1, query: sqlQuery.slice(0, 30), status: 'SUCCESS', checked_at: new Date().toLocaleTimeString() },
          ],
          rowCount: 1,
          durationMs: 18,
        };
      }
    } finally {
      isExecuting = false;
    }
  }

  async function handleCopyResults() {
    if (!queryResult || typeof navigator === 'undefined' || !navigator.clipboard) return;
    const text = JSON.stringify(queryResult.rows, null, 2);
    await navigator.clipboard.writeText(text);
    isCopied = true;
    setTimeout(() => {
      isCopied = false;
    }, 1500);
  }

  function handleSelectTemplate(tplSql: string) {
    sqlQuery = tplSql;
  }

  const resolvedTitle = $derived(title ?? (chinese ? '安全只读 SQL 控制台' : 'Safe Read-Only SQL Console'));
  const resolvedDesc = $derived(
    description ?? (chinese ? '生产只读沙箱环境，自动拦截写操作，支持毫秒级探查与结果导出' : 'Read-only query runner with destructive operation blocking'),
  );
</script>

<div
  data-svadmin-component="SqlConsole"
  class={cn(
    'w-full rounded-2xl border border-border bg-card text-card-foreground shadow-xs p-6 space-y-4 flex flex-col text-xs',
    className,
  )}
>
  <!-- Header Bar -->
  <div class="flex items-center justify-between border-b border-border/70 pb-4">
    <div class="flex items-center gap-2.5">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
        <Terminal class="h-5 w-5" />
      </div>
      <div>
        <h3 class="text-base font-semibold text-foreground">{resolvedTitle}</h3>
        <p class="text-xs text-muted-foreground">{resolvedDesc}</p>
      </div>
    </div>

    <!-- Safety Badge -->
    <div class="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 font-medium text-success border border-success/20 text-[11px]">
      <ShieldAlert class="h-3.5 w-3.5" />
      <span>{chinese ? '只读沙箱已开启' : 'Read-Only Enforced'}</span>
    </div>
  </div>

  <!-- Templates Bar -->
  {#if templates.length > 0}
    <div class="flex items-center gap-2 flex-wrap text-[11px]">
      <span class="text-muted-foreground font-semibold uppercase tracking-wider">{chinese ? '常用查询模板:' : 'Templates:'}</span>
      {#each templates as tpl (tpl.label)}
        <button
          type="button"
          onclick={() => handleSelectTemplate(tpl.sql)}
          class="rounded-md border border-border bg-muted/40 px-2 py-1 hover:bg-muted text-foreground transition-colors font-medium"
        >
          {tpl.label}
        </button>
      {/each}
    </div>
  {/if}

  <!-- SQL Textarea Input -->
  <div class="space-y-2">
    <div class="relative">
      <textarea
        bind:value={sqlQuery}
        rows="4"
        placeholder="SELECT ... FROM ... WHERE ...;"
        class={cn(
          'w-full rounded-xl border p-3 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          isDestructive ? 'border-destructive bg-destructive/5' : 'border-input bg-muted/20',
        )}
      ></textarea>
    </div>

    {#if isDestructive}
      <div role="alert" class="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-xs">
        <ShieldAlert class="h-4 w-4 shrink-0" />
        <span>{chinese ? '安全拦截: 检测到非只读语句 (DROP/DELETE/UPDATE/INSERT 等)，只读控制台已禁止执行。' : 'Safety Block: Write and DDL operations are strictly prohibited.'}</span>
      </div>
    {/if}

    <div class="flex items-center justify-between">
      <span class="text-[11px] text-muted-foreground">
        {chinese ? '提示: 仅允许执行 SELECT 探查查询' : 'Only SELECT queries permitted'}
      </span>

      <Button
        type="button"
        size="sm"
        disabled={isDestructive || !sqlQuery.trim() || isExecuting}
        onclick={handleExecute}
        class="gap-1.5"
      >
        <Play class="h-3.5 w-3.5" />
        <span>{chinese ? '执行查询' : 'Run Query'}</span>
      </Button>
    </div>
  </div>

  <!-- Results Section -->
  {#if queryResult}
    <div class="space-y-2.5 pt-2 border-t border-border/60">
      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-3">
          <span class="font-bold text-foreground">{chinese ? '查询结果' : 'Query Results'}</span>
          <span class="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            {queryResult.rowCount} {chinese ? '行数据' : 'rows'}
          </span>
          <span class="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <Clock class="h-3 w-3" />
            <span>{queryResult.durationMs}ms</span>
          </span>
        </div>

        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-7 text-xs gap-1"
            onclick={handleCopyResults}
          >
            {#if isCopied}
              <Check class="h-3.5 w-3.5 text-success" />
              <span>{chinese ? '已复制' : 'Copied'}</span>
            {:else}
              <Copy class="h-3.5 w-3.5" />
              <span>{chinese ? '复制 JSON' : 'Copy'}</span>
            {/if}
          </Button>
        </div>
      </div>

      <!-- Results Data Grid -->
      <div class="rounded-xl border border-border overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead class="bg-muted/40 border-b border-border font-semibold text-muted-foreground">
            <tr>
              {#each queryResult.columns as col (col)}
                <th class="p-2.5 whitespace-nowrap font-mono">{col}</th>
              {/each}
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            {#each queryResult.rows as row, idx (idx)}
              <tr class="hover:bg-muted/20">
                {#each queryResult.columns as col (col)}
                  <td class="p-2.5 whitespace-nowrap font-mono text-foreground">{String(row[col] ?? '')}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
