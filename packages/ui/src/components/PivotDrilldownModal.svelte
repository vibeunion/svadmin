<script lang="ts">
  import {
    X,
    Maximize2,
    Minimize2,
    Search,
    Filter,
    TableProperties,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core';
  import ExcelExportButton from './ExcelExportButton.svelte';

  export interface PivotDrilldownFilter {
    dimension: string;
    value: string | number;
  }

  export interface PivotDrilldownColumn {
    key: string;
    label: string;
    formatter?: ((value: unknown, record: Record<string, unknown>) => string) | undefined;
  }

  export interface PivotDrilldownModalProps {
    open?: boolean | undefined;
    title?: string | undefined;
    filters?: PivotDrilldownFilter[] | undefined;
    columns: PivotDrilldownColumn[];
    records: Record<string, unknown>[];
    exportable?: boolean | undefined;
    class?: string | undefined;
    onclose?: (() => void) | undefined;
  }

  let {
    open = $bindable(false),
    title,
    filters = [],
    columns = [],
    records = [],
    exportable = true,
    class: className = '',
    onclose,
  }: PivotDrilldownModalProps = $props();

  const i18n = useTranslation();
  let isFullscreen = $state(false);
  let searchQuery = $state('');

  function handleClose() {
    open = false;
    isFullscreen = false;
    onclose?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      handleClose();
    }
  }

  const filteredRecords = $derived.by(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter((r) =>
      columns.some((col) => {
        const val = r[col.key];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
      }),
    );
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    role="dialog"
    aria-modal="true"
    data-svadmin-component="PivotDrilldownModal"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in-0 duration-200"
  >
    <div
      class={cn(
        'flex flex-col bg-card border border-border text-card-foreground shadow-[var(--shadow-overlay)] transition-all duration-200 overflow-hidden',
        isFullscreen
          ? 'fixed inset-2 rounded-md'
          : 'w-full max-w-4xl max-h-[85vh] rounded-md',
        className,
      )}
    >
      <!-- 弹窗顶栏 -->
      <div class="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/20">
        <div class="flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-sm bg-primary/10 text-primary">
            <TableProperties size={18} />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-foreground">
              {title ?? i18n.t('pivot.drilldownTitle')}
            </h3>
            <p class="text-xs text-muted-foreground">
              {i18n.t('pivot.totalRecords', { count: records.length })}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            onclick={() => { isFullscreen = !isFullscreen; }}
            aria-label={isFullscreen ? 'Restore' : 'Maximize'}
          >
            {#if isFullscreen}
              <Minimize2 size={15} />
            {:else}
              <Maximize2 size={15} />
            {/if}
          </button>

          <button
            type="button"
            class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            onclick={handleClose}
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <!-- 切片过滤条件胶囊栏 -->
      {#if filters.length > 0}
        <div class="px-5 py-2.5 border-b border-border/60 bg-muted/10 flex items-center gap-2 flex-wrap">
          <div class="flex items-center gap-1 text-xs text-muted-foreground font-medium mr-1">
            <Filter size={13} />
            <span>{i18n.t('pivot.filterCriteria')}:</span>
          </div>
          {#each filters as f (f.dimension)}
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium border border-primary/20">
              <span class="opacity-75">{f.dimension}:</span>
              <span>{f.value}</span>
            </div>
          {/each}
        </div>
      {/if}

      <!-- 工具栏：关键词检索与导出 -->
      <div class="px-5 py-3 border-b border-border/50 flex items-center justify-between gap-3">
        <div class="relative flex-1 max-w-sm">
          <Search size={14} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="搜索明细内容…"
            class="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {#if exportable}
          <ExcelExportButton
            columns={columns.map((c) => ({
              key: c.key,
              label: c.label,
              formatter: c.formatter,
            }))}
            dataSource={filteredRecords}
            filename={`pivot-drilldown-${Date.now()}`}
            size="sm"
            variant="outline"
          />
        {/if}
      </div>

      <!-- 明细表格主体 -->
      <div class="flex-1 overflow-auto p-4">
        <div class="rounded-md border border-border overflow-hidden">
          <table class="w-full text-xs text-left whitespace-nowrap">
            <thead class="bg-muted/40 border-b border-border text-muted-foreground font-semibold sticky top-0">
              <tr>
                <th class="p-2.5 w-12 text-center">#</th>
                {#each columns as col (col.key)}
                  <th class="p-2.5">{col.label}</th>
                {/each}
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {#each filteredRecords as row, idx (idx)}
                <tr class="hover:bg-muted/20">
                  <td class="p-2.5 text-center text-muted-foreground">{idx + 1}</td>
                  {#each columns as col (col.key)}
                    {@const val = row[col.key]}
                    {@const displayVal = col.formatter ? col.formatter(val, row) : val}
                    <td class="p-2.5 text-foreground">{displayVal ?? '-'}</td>
                  {/each}
                </tr>
              {/each}

              {#if filteredRecords.length === 0}
                <tr>
                  <td colspan={columns.length + 1} class="py-12 text-center text-muted-foreground">
                    暂无匹配明细数据
                  </td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 底部关闭栏 -->
      <div class="border-t border-border px-5 py-3 bg-muted/10 flex items-center justify-between text-xs">
        <span class="text-muted-foreground">
          显示 {filteredRecords.length} / {records.length} 条记录
        </span>
        <button
          type="button"
          class="px-4 py-1.5 rounded-md border border-border bg-background text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
          onclick={handleClose}
        >
          关闭
        </button>
      </div>
    </div>
  </div>
{/if}
