<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    ClipboardCopy,
    ClipboardPaste,
    Check,
    X,
    FileSpreadsheet,
    ArrowRight,
    Undo2,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import {
    type ColumnDef,
    type ColumnMapping,
    type ParsedClipboardTable,
    parseClipboardText,
    matchColumnsToDefinitions,
    copyRowsToClipboard,
  } from './useTableClipboard.svelte.js';

  export interface TableClipboardManagerProps {
    columns: ColumnDef[];
    selectedRows?: Record<string, unknown>[] | undefined;
    class?: string | undefined;
    onPasteConfirmed?: ((rows: Record<string, unknown>[], mode: 'append' | 'overwrite') => void) | undefined;
    onUndo?: (() => void) | undefined;
    children?: Snippet | undefined;
  }

  let {
    columns,
    selectedRows = [],
    class: className = '',
    onPasteConfirmed,
    onUndo,
    children,
  }: TableClipboardManagerProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let isModalOpen = $state(false);
  let isCopySuccess = $state(false);
  let pasteMode = $state<'append' | 'overwrite'>('append');
  let parsedTable = $state<ParsedClipboardTable | null>(null);
  let columnMappings = $state<ColumnMapping[]>([]);
  let hasUndoableAction = $state(false);

  async function handleCopySelection() {
    if (selectedRows.length === 0) return;
    const ok = await copyRowsToClipboard(selectedRows, columns);
    if (ok) {
      isCopySuccess = true;
      setTimeout(() => {
        isCopySuccess = false;
      }, 1500);
    }
  }

  function handleProcessText(rawText: string) {
    if (!rawText.trim()) return;
    const parsed = parseClipboardText(rawText, columns);
    if (parsed.rowCount === 0) return;

    parsedTable = parsed;
    columnMappings = matchColumnsToDefinitions(parsed.headers, columns);
    isModalOpen = true;
  }

  async function handlePasteFromButton() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        const text = await navigator.clipboard.readText();
        handleProcessText(text);
      } catch {
        // Clipboard read blocked
      }
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    // Cmd+V / Ctrl+V
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      void handlePasteFromButton();
    }
  }

  function handleConfirmPaste() {
    if (!parsedTable) return;

    const mappedRows: Record<string, unknown>[] = parsedTable.rows.map((row) => {
      const obj: Record<string, unknown> = {};
      columnMappings.forEach((map) => {
        const targetKey = map.matchedColumnKey ?? map.clipboardHeader;
        obj[targetKey] = row[map.clipboardHeader] ?? '';
      });
      return obj;
    });

    onPasteConfirmed?.(mappedRows, pasteMode);
    hasUndoableAction = true;
    isModalOpen = false;
    parsedTable = null;
  }

  function handleUndo() {
    onUndo?.();
    hasUndoableAction = false;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  data-svadmin-component="TableClipboardManager"
  class={cn('inline-flex items-center gap-2', className)}
  onkeydown={handleKeydown}
>
  {#if children}
    {@render children()}
  {/if}

  <div class="flex items-center gap-1.5 rounded-lg border border-border bg-card p-1 shadow-2xs text-xs">
    <!-- Copy selected rows button -->
    <Button
      type="button"
      variant="ghost"
      size="sm"
      class="h-7 px-2 gap-1 text-[11px]"
      disabled={selectedRows.length === 0}
      onclick={handleCopySelection}
      title={chinese ? '复制选中行到剪贴板 (Excel TSV 格式)' : 'Copy selected rows as TSV'}
    >
      {#if isCopySuccess}
        <Check class="h-3.5 w-3.5 text-success" />
        <span class="text-success">{chinese ? '已复制' : 'Copied'}</span>
      {:else}
        <ClipboardCopy class="h-3.5 w-3.5 text-muted-foreground" />
        <span>
          {chinese
            ? selectedRows.length > 0
              ? `复制选中 (${selectedRows.length})`
              : '复制选中'
            : selectedRows.length > 0
              ? `Copy (${selectedRows.length})`
              : 'Copy'}
        </span>
      {/if}
    </Button>

    <div class="h-3.5 w-px bg-border"></div>

    <!-- Paste from clipboard button -->
    <Button
      type="button"
      variant="ghost"
      size="sm"
      class="h-7 px-2 gap-1 text-[11px]"
      onclick={handlePasteFromButton}
      title={chinese ? '从剪贴板粘贴 Excel / 表格数据' : 'Paste table data from clipboard'}
    >
      <ClipboardPaste class="h-3.5 w-3.5 text-muted-foreground" />
      <span>{chinese ? '粘贴表格' : 'Paste'}</span>
    </Button>

    {#if hasUndoableAction && onUndo}
      <div class="h-3.5 w-px bg-border"></div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="h-7 px-2 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        onclick={handleUndo}
        title={chinese ? '撤销上次粘贴' : 'Undo last paste'}
      >
        <Undo2 class="h-3.5 w-3.5" />
        <span>{chinese ? '撤销' : 'Undo'}</span>
      </Button>
    {/if}
  </div>
</div>

<!-- Paste Preview Modal Dialog -->
{#if isModalOpen && parsedTable}
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="clipboard-preview-title"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
  >
    <div
      class="relative z-10 flex flex-col w-full max-w-2xl max-h-[85vh] rounded-md border border-border bg-card text-card-foreground shadow-[var(--shadow-overlay)] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-border/70 px-6 py-4 bg-card">
        <div class="flex items-center gap-2.5 text-primary">
          <FileSpreadsheet class="h-5 w-5" />
          <h3 id="clipboard-preview-title" class="text-base font-semibold text-foreground">
            {chinese ? '剪贴板数据导入预览' : 'Paste Data Preview'}
          </h3>
        </div>
        <button
          type="button"
          onclick={() => (isModalOpen = false)}
          class="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Overview bar -->
      <div class="flex items-center justify-between border-b border-border/60 bg-muted/20 px-6 py-3 text-xs">
        <span class="text-muted-foreground">
          {chinese
            ? `解析出 ${parsedTable.rowCount} 行数据，${parsedTable.colCount} 列`
            : `Detected ${parsedTable.rowCount} rows, ${parsedTable.colCount} columns`}
        </span>

        <div class="flex items-center gap-3">
          <span class="font-medium text-foreground">{chinese ? '写入方式:' : 'Mode:'}</span>
          <label class="inline-flex items-center gap-1 cursor-pointer">
            <input type="radio" value="append" bind:group={pasteMode} class="text-primary" />
            <span>{chinese ? '追加为新行' : 'Append'}</span>
          </label>
          <label class="inline-flex items-center gap-1 cursor-pointer">
            <input type="radio" value="overwrite" bind:group={pasteMode} class="text-primary" />
            <span>{chinese ? '覆盖已有行' : 'Overwrite'}</span>
          </label>
        </div>
      </div>

      <!-- Column Mapping List -->
      <div class="px-6 py-3 border-b border-border/50 bg-background text-xs">
        <div class="font-semibold text-muted-foreground mb-2 uppercase tracking-wider text-[11px]">
          {chinese ? '字段映射对齐' : 'Column Alignment'}
        </div>
        <div class="flex flex-wrap gap-2">
          {#each columnMappings as map (map.clipboardIndex)}
            <div class="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1">
              <span class="font-medium text-foreground">{map.clipboardHeader}</span>
              <ArrowRight class="h-3 w-3 text-muted-foreground" />
              {#if map.matchedColumnLabel}
                <span class="text-success font-medium">{map.matchedColumnLabel}</span>
              {:else}
                <span class="text-muted-foreground italic">{chinese ? '未映射' : 'Unmapped'}</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- Data Preview Table (First 5 rows) -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        <div class="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
          {chinese ? '前 5 行数据预览' : 'First 5 Rows Preview'}
        </div>
        <div class="rounded-lg border border-border overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-muted/40 border-b border-border">
              <tr>
                <th class="p-2 font-mono text-[11px] text-muted-foreground w-10">#</th>
                {#each parsedTable.headers as h (h)}
                  <th class="p-2 font-medium text-foreground whitespace-nowrap">{h}</th>
                {/each}
              </tr>
            </thead>
            <tbody class="divide-y divide-border/60">
              {#each parsedTable.rawGrid.slice(0, 5) as row, idx (idx)}
                <tr class="hover:bg-muted/30">
                  <td class="p-2 font-mono text-[11px] text-muted-foreground">{idx + 1}</td>
                  {#each row as cell, cellIdx (cellIdx)}
                    <td class="p-2 text-foreground whitespace-nowrap max-w-44 truncate">{cell}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between border-t border-border/70 px-6 py-4 bg-card">
        <span class="text-[11px] text-muted-foreground">
          {chinese ? '确认后将把表格数据批量导入' : 'Confirm to write parsed rows to table'}
        </span>

        <div class="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onclick={() => (isModalOpen = false)}>
            {chinese ? '取消' : 'Cancel'}
          </Button>

          <Button type="button" size="sm" onclick={handleConfirmPaste} class="gap-1 min-w-24">
            <Check class="h-3.5 w-3.5" />
            <span>{chinese ? '确认导入' : 'Confirm'}</span>
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
