<script lang="ts">
  import { X, Plus, Trash2, Edit3, AlertTriangle, Loader2 } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface BatchFieldOption {
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'boolean';
    options?: Array<{ label: string; value: string | number }> | undefined;
    placeholder?: string | undefined;
  }

  export interface BatchEditChange {
    field: string;
    value: string | number | boolean | null;
    mode: 'replace' | 'append' | 'clear';
  }

  export interface BatchEditModalProps {
    open?: boolean | undefined;
    selectedCount: number;
    resourceName?: string | undefined;
    fields: BatchFieldOption[];
    onconfirm?: ((changes: BatchEditChange[]) => Promise<void> | void) | undefined;
    onclose?: (() => void) | undefined;
    class?: string | undefined;
  }

  let {
    open = false,
    selectedCount = 0,
    resourceName = '数据记录',
    fields = [],
    onconfirm,
    onclose,
    class: className = '',
  }: BatchEditModalProps = $props();

  interface ChangeRow {
    id: string;
    field: string;
    mode: 'replace' | 'append' | 'clear';
    value: string | number | boolean | null;
  }

  let changeRows = $state<ChangeRow[]>([]);
  let isSubmitting = $state(false);
  let errorMessage = $state('');

  function makeId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  function addRow() {
    const unselectedField = fields.find((f) => !changeRows.some((r) => r.field === f.key)) ?? fields[0];
    if (!unselectedField) return;
    changeRows = [
      ...changeRows,
      {
        id: makeId(),
        field: unselectedField.key,
        mode: 'replace',
        value: '',
      },
    ];
  }

  function removeRow(id: string) {
    changeRows = changeRows.filter((r) => r.id !== id);
  }

  $effect(() => {
    if (open) {
      changeRows = fields.length > 0 ? [{ id: makeId(), field: fields[0]?.key ?? '', mode: 'replace', value: '' }] : [];
      isSubmitting = false;
      errorMessage = '';
    }
  });

  async function handleConfirm() {
    if (changeRows.length === 0 || selectedCount === 0) return;
    isSubmitting = true;
    errorMessage = '';

    try {
      const payload: BatchEditChange[] = changeRows.map((r) => ({
        field: r.field,
        value: r.mode === 'clear' ? null : r.value,
        mode: r.mode,
      }));

      if (onconfirm) {
        await onconfirm(payload);
      }
      onclose?.();
    } catch (err: unknown) {
      errorMessage = err instanceof Error ? err.message : '批量更新失败，请重试';
    } finally {
      isSubmitting = false;
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs select-none"
    data-svadmin-component="BatchEditModal"
    role="dialog"
    aria-modal="true"
  >
    <div
      class={cn(
        'relative w-full max-w-lg rounded-md border border-border bg-card text-card-foreground shadow-[var(--shadow-overlay)] overflow-hidden flex flex-col',
        className
      )}
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/30">
        <div class="flex items-center gap-2">
          <Edit3 class="h-4 w-4 text-primary" />
          <h3 class="font-semibold text-sm text-foreground">
            批量修改 {resourceName} ({selectedCount} 条记录)
          </h3>
        </div>
        <button
          type="button"
          class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          onclick={onclose}
          disabled={isSubmitting}
          aria-label="Close modal"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Warning Banner -->
      <div class="bg-warning/10 border-b border-warning/20 p-3 flex items-start gap-2 text-xs text-warning">
        <AlertTriangle class="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <span class="font-bold">高影响操作提示：</span>
          <span>本次批量修改将同时同步覆盖已勾选的 <strong>{selectedCount}</strong> 条{resourceName}，请仔细核对变更字段及新值。</span>
        </div>
      </div>

      <!-- Rows Body -->
      <div class="p-5 overflow-y-auto max-h-80 space-y-3 text-xs">
        {#if errorMessage}
          <div class="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {errorMessage}
          </div>
        {/if}

        <div class="space-y-2.5">
          {#each changeRows as row (row.id)}
            {@const fieldDef = fields.find((f) => f.key === row.field)}
            <div class="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-border bg-muted/20">
              <!-- Field Picker -->
              <select data-size="compact"
                class="svadmin-select w-32"
                bind:value={row.field}
                disabled={isSubmitting}
              >
                {#each fields as f (f.key)}
                  <option value={f.key}>{f.label}</option>
                {/each}
              </select>

              <!-- Edit Mode -->
              <select data-size="compact"
                class="svadmin-select font-mono w-24"
                bind:value={row.mode}
                disabled={isSubmitting}
              >
                <option value="replace">替换为</option>
                <option value="append">追加</option>
                <option value="clear">置空清空</option>
              </select>

              <!-- Value Input -->
              {#if row.mode !== 'clear'}
                {#if fieldDef?.type === 'select' && fieldDef.options}
                  <select data-size="compact"
                    class="svadmin-select flex-1 min-w-[120px]"
                    bind:value={row.value}
                    disabled={isSubmitting}
                  >
                    <option value="">请选择新值</option>
                    {#each fieldDef.options as opt (opt.value)}
                      <option value={opt.value}>{opt.label}</option>
                    {/each}
                  </select>
                {:else if fieldDef?.type === 'number'}
                  <input
                    type="number"
                    class="rounded border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary flex-1 min-w-[120px] font-mono"
                    bind:value={row.value}
                    placeholder="输入新数值"
                    disabled={isSubmitting}
                  />
                {:else}
                  <input
                    type="text"
                    class="rounded border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary flex-1 min-w-[120px]"
                    bind:value={row.value}
                    placeholder="输入新内容…"
                    disabled={isSubmitting}
                  />
                {/if}
              {:else}
                <span class="text-muted-foreground italic flex-1 px-2 select-none">将该字段清空为 NULL</span>
              {/if}

              <!-- Remove Row -->
              <button
                type="button"
                class="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                onclick={() => removeRow(row.id)}
                disabled={isSubmitting || changeRows.length <= 1}
                aria-label="Remove field change"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          {/each}
        </div>

        {#if changeRows.length < fields.length}
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded border border-dashed border-border px-3 py-1.5 text-xs text-primary hover:bg-primary/5 transition-colors cursor-pointer w-full justify-center font-medium"
            onclick={addRow}
            disabled={isSubmitting}
          >
            <Plus class="h-3.5 w-3.5" />
            <span>添加待修改字段 ({changeRows.length}/{fields.length})</span>
          </button>
        {/if}
      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-end gap-2 border-t border-border px-5 py-3 bg-muted/20 text-xs">
        <button
          type="button"
          class="rounded-md border border-border bg-card px-3.5 py-1.5 font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
          onclick={onclose}
          disabled={isSubmitting}
        >
          取消
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          onclick={handleConfirm}
          disabled={isSubmitting || changeRows.length === 0}
        >
          {#if isSubmitting}
            <Loader2 class="h-3.5 w-3.5 animate-spin" />
            <span>正在更新…</span>
          {:else}
            <span>确认批量修改</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
