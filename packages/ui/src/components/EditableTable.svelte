<script lang="ts">
  import { Button } from './ui/button/index.js';
  import { Plus, Trash2, Save, Loader2 } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface EditableTableColumn {
    key: string;
    label: string;
    type?: 'text' | 'number' | 'select' | 'boolean' | 'date';
    options?: Array<{ label: string; value: string | number }>;
    required?: boolean;
    width?: string;
    readonly?: boolean;
  }

  interface Props {
    columns: EditableTableColumn[];
    data?: Record<string, unknown>[];
    rowKey?: string;
    allowAdd?: boolean;
    allowDelete?: boolean;
    onchange?: (data: Record<string, unknown>[]) => void;
    onsave?: (data: Record<string, unknown>[]) => void | Promise<void>;
    class?: string;
  }

  let {
    columns,
    data = $bindable([]),
    rowKey = 'id',
    allowAdd = true,
    allowDelete = true,
    onchange,
    onsave,
    class: className = '',
  }: Props = $props();

  let isSaving = $state(false);

  function updateCell(rowIndex: number, columnKey: string, value: unknown) {
    const nextData = [...data];
    nextData[rowIndex] = {
      ...nextData[rowIndex],
      [columnKey]: value,
    };
    data = nextData;
    onchange?.(data);
  }

  function handleAddRow() {
    const newRow: Record<string, unknown> = {
      [rowKey]: `row_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    for (const col of columns) {
      if (col.type === 'number') newRow[col.key] = 0;
      else if (col.type === 'boolean') newRow[col.key] = false;
      else newRow[col.key] = '';
    }
    data = [...data, newRow];
    onchange?.(data);
  }

  function handleDeleteRow(index: number) {
    data = data.filter((_, idx) => idx !== index);
    onchange?.(data);
  }

  async function handleSave() {
    isSaving = true;
    try {
      await onsave?.(data);
    } finally {
      isSaving = false;
    }
  }
</script>

<div class={cn('space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs text-xs', className)}>
  <div class="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
    <div class="font-semibold text-foreground">
      Editable Grid <span class="text-muted-foreground font-normal">({data.length} records)</span>
    </div>

    <div class="flex items-center gap-2">
      {#if allowAdd}
        <Button variant="outline" size="sm" class="h-8 text-xs gap-1" onclick={handleAddRow}>
          <Plus class="h-3.5 w-3.5" />
          Add Row
        </Button>
      {/if}
      {#if onsave}
        <Button size="sm" class="h-8 text-xs gap-1 min-w-20" disabled={isSaving} onclick={handleSave}>
          {#if isSaving}
            <Loader2 class="h-3.5 w-3.5 animate-spin" />
          {:else}
            <Save class="h-3.5 w-3.5" />
          {/if}
          Save All
        </Button>
      {/if}
    </div>
  </div>

  <div class="overflow-x-auto rounded-lg border border-border/60">
    <table class="w-full text-left border-collapse">
      <thead class="bg-muted/40 font-semibold text-muted-foreground border-b border-border/60">
        <tr>
          {#each columns as col (col.key)}
            <th style={col.width ? `width: ${col.width};` : ''} class="px-3 py-2.5">
              {col.label}
              {#if col.required}<span class="text-destructive">*</span>{/if}
            </th>
          {/each}
          {#if allowDelete}
            <th class="w-12 px-3 py-2.5 text-center">Action</th>
          {/if}
        </tr>
      </thead>
      <tbody class="divide-y divide-border/40">
        {#each data as row, rowIndex (row[rowKey] ?? rowIndex)}
          <tr class="hover:bg-muted/20 transition-colors">
            {#each columns as col (col.key)}
              <td class="p-1.5">
                {#if col.readonly}
                  <div class="px-2 py-1 text-muted-foreground font-mono truncate">{row[col.key] ?? '—'}</div>
                {:else if col.type === 'select' && col.options}
                  <select
                    class="h-7.5 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={String(row[col.key] ?? '')}
                    onchange={(e) => updateCell(rowIndex, col.key, e.currentTarget.value)}
                  >
                    {#each col.options as opt (opt.value)}
                      <option value={String(opt.value)}>{opt.label}</option>
                    {/each}
                  </select>
                {:else if col.type === 'boolean'}
                  <div class="flex items-center justify-center py-1">
                    <input
                      type="checkbox"
                      class="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                      checked={Boolean(row[col.key])}
                      onchange={(e) => updateCell(rowIndex, col.key, e.currentTarget.checked)}
                    />
                  </div>
                {:else if col.type === 'number'}
                  <input
                    type="number"
                    class="h-7.5 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={Number(row[col.key] ?? 0)}
                    oninput={(e) => updateCell(rowIndex, col.key, Number(e.currentTarget.value))}
                  />
                {:else if col.type === 'date'}
                  <input
                    type="date"
                    class="h-7.5 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={String(row[col.key] ?? '')}
                    oninput={(e) => updateCell(rowIndex, col.key, e.currentTarget.value)}
                  />
                {:else}
                  <input
                    type="text"
                    class="h-7.5 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={String(row[col.key] ?? '')}
                    oninput={(e) => updateCell(rowIndex, col.key, e.currentTarget.value)}
                  />
                {/if}
              </td>
            {/each}

            {#if allowDelete}
              <td class="p-1.5 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onclick={() => handleDeleteRow(rowIndex)}
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </Button>
              </td>
            {/if}
          </tr>
        {/each}

        {#if data.length === 0}
          <tr>
            <td colspan={columns.length + (allowDelete ? 1 : 0)} class="py-8 text-center text-muted-foreground">
              No rows. Click "Add Row" to create the first record.
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
