<script lang="ts">
  import {
    Layers,
    Plus,
    Trash2,
    Search,
    FileText,
    Save,
  } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import * as Sheet from './ui/sheet/index.js';

  export interface MasterFieldMeta {
    key: string;
    label: string;
  }

  export interface SubTableColumnMeta {
    key: string;
    label: string;
    align?: ('left' | 'center' | 'right') | undefined;
  }

  export interface MasterSubTableDrawerProps {
    open?: boolean | undefined;
    masterRecord: Record<string, unknown>;
    masterFields?: MasterFieldMeta[] | undefined;
    subColumns: SubTableColumnMeta[];
    subItems?: Array<Record<string, unknown>> | undefined;
    title?: string | undefined;
    subTitle?: string | undefined;
    class?: string | undefined;
    onAddSubItem?: (() => void) | undefined;
    onDeleteSubItem?: ((index: number, item: Record<string, unknown>) => void) | undefined;
    onSave?: ((subItems: Array<Record<string, unknown>>) => void) | undefined;
  }

  let {
    open = $bindable(false),
    masterRecord = {},
    masterFields = [
      { key: 'orderNo', label: '主订单编号' },
      { key: 'customer', label: '客户姓名' },
      { key: 'status', label: '审批状态' },
      { key: 'totalAmount', label: '核算总金额' },
    ],
    subColumns = [
      { key: 'sku', label: '商品SKU' },
      { key: 'name', label: '品名' },
      { key: 'quantity', label: '采购数量', align: 'right' },
      { key: 'unitPrice', label: '单价', align: 'right' },
      { key: 'subtotal', label: '小计', align: 'right' },
    ],
    subItems = $bindable([
      { sku: 'HW-01', name: '万兆光模块', quantity: 20, unitPrice: '¥380.00', subtotal: '¥7,600.00' },
      { sku: 'HW-02', name: '机架式光缆熔接盒', quantity: 4, unitPrice: '¥850.00', subtotal: '¥3,400.00' },
    ]),
    title,
    subTitle,
    class: className = '',
    onAddSubItem,
    onDeleteSubItem,
    onSave,
  }: MasterSubTableDrawerProps = $props();

  const i18n = useTranslation();
  const chinese = $derived(i18n.locale.startsWith('zh'));

  let searchQuery = $state('');

  const filteredSubItems = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return subItems;
    return subItems.filter((item) =>
      Object.values(item).some((val) => String(val ?? '').toLowerCase().includes(q)),
    );
  });

  function removeRow(idx: number, item: Record<string, unknown>) {
    subItems = subItems.filter((_, i) => i !== idx);
    onDeleteSubItem?.(idx, item);
  }

  const resolvedTitle = $derived(title ?? (chinese ? '主从嵌套数据探索器' : 'Master-Detail Nested Explorer'));
  const resolvedSubTitle = $derived(subTitle ?? (chinese ? '关联子表记录明细' : 'Nested Line Items'));
</script>

<Sheet.Root bind:open>
  <Sheet.Content side="right" class={cn('w-full sm:max-w-2xl p-0 flex flex-col', className)}>
    <!-- Header -->
    <div class="px-6 py-5 border-b border-border/70 bg-card">
      <div class="flex items-center gap-2.5 text-primary">
        <Layers class="h-5 w-5" />
        <Sheet.Title class="text-base font-semibold text-foreground">
          {resolvedTitle}
        </Sheet.Title>
      </div>
      <Sheet.Description class="text-xs text-muted-foreground mt-1">
        {chinese ? '单条主记录及其 1:N 级联明细清单联动浏览与快速编辑' : '1:N master record and child items viewer'}
      </Sheet.Description>
    </div>

    <!-- Master Record Summary Card -->
    <div class="p-6 border-b border-border/60 bg-muted/20">
      <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
        <FileText class="h-3.5 w-3.5 text-primary" />
        <span>{chinese ? '主记录关键属性' : 'Master Record Properties'}</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {#each masterFields as field (field.key)}
          <div class="bg-card p-3 rounded-xl border border-border/70">
            <span class="block text-[11px] text-muted-foreground">{field.label}</span>
            <span class="font-bold font-mono text-foreground text-xs mt-0.5 truncate block">
              {String(masterRecord[field.key] ?? '—')}
            </span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Sub-table Section -->
    <div class="flex-1 overflow-y-auto p-6 space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-foreground">{resolvedSubTitle}</span>
          <span class="rounded bg-primary/10 px-2 py-0.2 text-[10px] font-bold text-primary font-mono">
            {subItems.length} {chinese ? '条明细' : 'items'}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <div class="relative flex items-center">
            <Search class="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              bind:value={searchQuery}
              placeholder={chinese ? '筛选明细...' : 'Search items...'}
              class="h-7 w-40 rounded border border-input bg-background pl-7.5 pr-2 text-xs focus-visible:outline-none"
            />
          </div>

          {#if onAddSubItem}
            <Button size="sm" variant="outline" class="h-7 text-xs gap-1" onclick={onAddSubItem}>
              <Plus class="h-3.5 w-3.5" />
              <span>{chinese ? '加一行' : 'Add Row'}</span>
            </Button>
          {/if}
        </div>
      </div>

      <!-- Sub-items Table -->
      <div class="rounded-xl border border-border overflow-hidden">
        <table class="w-full text-left text-xs border-collapse">
          <thead class="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
            <tr>
              <th class="p-2.5 w-8 font-mono text-[11px]">#</th>
              {#each subColumns as col (col.key)}
                <th
                  class={cn(
                    'p-2.5 whitespace-nowrap',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                  )}
                >
                  {col.label}
                </th>
              {/each}
              <th class="p-2.5 w-12 text-center">{chinese ? '操作' : 'Action'}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            {#each filteredSubItems as item, idx (idx)}
              <tr class="hover:bg-muted/20">
                <td class="p-2.5 font-mono text-muted-foreground text-[11px]">{idx + 1}</td>
                {#each subColumns as col (col.key)}
                  <td
                    class={cn(
                      'p-2.5 font-mono text-foreground',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                    )}
                  >
                    {String(item[col.key] ?? '')}
                  </td>
                {/each}
                <td class="p-2.5 text-center">
                  <button
                    type="button"
                    onclick={() => removeRow(idx, item)}
                    class="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label="Remove item"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="flex items-center justify-between border-t border-border/70 px-6 py-4 bg-card">
      <span class="text-[11px] text-muted-foreground">
        {chinese ? '明细项变更可一键同步保存' : 'Child item mutations syncable'}
      </span>

      <div class="flex items-center gap-2">
        <Button size="sm" variant="ghost" onclick={() => (open = false)}>
          {chinese ? '关闭' : 'Close'}
        </Button>
        {#if onSave}
          <Button size="sm" class="gap-1.5" onclick={() => onSave(subItems)}>
            <Save class="h-3.5 w-3.5" />
            <span>{chinese ? '保存变更' : 'Save'}</span>
          </Button>
        {/if}
      </div>
    </div>
  </Sheet.Content>
</Sheet.Root>
