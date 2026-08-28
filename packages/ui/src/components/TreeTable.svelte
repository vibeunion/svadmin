<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronRight, ChevronDown, Folder, File } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import { Checkbox } from './ui/checkbox/index.js';
  import { cn } from '../utils.js';

  export interface TreeTableColumn {
    key: string;
    label: string;
    width?: string;
  }

  interface Props {
    data: Record<string, unknown>[];
    columns: TreeTableColumn[];
    primaryKey?: string;
    childrenKey?: string;
    selectable?: boolean;
    selectedKeys?: (string | number)[];
    onselect?: (selectedKeys: (string | number)[]) => void;
    rowActions?: Snippet<[{ record: Record<string, unknown>; id: string | number }]>;
    customCell?: Snippet<[{ column: TreeTableColumn; record: Record<string, unknown>; value: unknown }]>;
    class?: string;
  }

  let {
    data = [],
    columns = [],
    primaryKey = 'id',
    childrenKey = 'children',
    selectable = false,
    selectedKeys = $bindable([]),
    onselect,
    rowActions,
    customCell,
    class: className = '',
  }: Props = $props();

  let expandedKeys = $state<Set<string | number>>(new Set());

  interface FlatTreeItem {
    record: Record<string, unknown>;
    id: string | number;
    level: number;
    hasChildren: boolean;
    isExpanded: boolean;
    isLastChild?: boolean;
  }

  function flattenTree(items: Record<string, unknown>[], level = 0): FlatTreeItem[] {
    const flat: FlatTreeItem[] = [];
    for (const item of items) {
      const id = item[primaryKey] as string | number;
      const children = item[childrenKey] as Record<string, unknown>[] | undefined;
      const hasChildren = Array.isArray(children) && children.length > 0;
      const isExpanded = expandedKeys.has(id);

      flat.push({
        record: item,
        id,
        level,
        hasChildren,
        isExpanded,
      });

      if (hasChildren && isExpanded && children) {
        flat.push(...flattenTree(children, level + 1));
      }
    }
    return flat;
  }

  const flattenedRows = $derived(flattenTree(data));

  function toggleExpand(id: string | number) {
    const next = new Set(expandedKeys);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    expandedKeys = next;
  }

  function expandAll() {
    const all = new Set<string | number>();
    function collect(items: Record<string, unknown>[]) {
      for (const item of items) {
        const id = item[primaryKey] as string | number;
        const children = item[childrenKey] as Record<string, unknown>[] | undefined;
        if (Array.isArray(children) && children.length > 0) {
          all.add(id);
          collect(children);
        }
      }
    }
    collect(data);
    expandedKeys = all;
  }

  function collapseAll() {
    expandedKeys = new Set();
  }

  function getAllDescendantIds(item: Record<string, unknown>): (string | number)[] {
    const ids: (string | number)[] = [item[primaryKey] as string | number];
    const children = item[childrenKey] as Record<string, unknown>[] | undefined;
    if (Array.isArray(children)) {
      for (const child of children) {
        ids.push(...getAllDescendantIds(child));
      }
    }
    return ids;
  }

  function toggleSelect(item: Record<string, unknown>) {
    const descendantIds = getAllDescendantIds(item);
    const isSelected = selectedKeys.includes(item[primaryKey] as string | number);

    let next: (string | number)[];
    if (isSelected) {
      next = selectedKeys.filter((k) => !descendantIds.includes(k));
    } else {
      next = Array.from(new Set([...selectedKeys, ...descendantIds]));
    }

    selectedKeys = next;
    onselect?.(next);
  }
</script>

<div class={cn('w-full space-y-2', className)}>
  <div class="flex items-center justify-between px-1 py-1 text-xs">
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="sm" class="h-6 px-2 text-xs" onclick={expandAll}>
        Expand All
      </Button>
      <Button variant="ghost" size="sm" class="h-6 px-2 text-xs text-muted-foreground" onclick={collapseAll}>
        Collapse All
      </Button>
    </div>
    {#if selectable && selectedKeys.length > 0}
      <span class="text-xs text-muted-foreground">
        Selected: <strong class="text-foreground">{selectedKeys.length}</strong>
      </span>
    {/if}
  </div>

  <div class="rounded-lg border border-border/80 overflow-hidden bg-card">
    <table class="w-full text-left text-xs border-collapse">
      <thead class="bg-muted/50 border-b border-border/60 font-semibold text-muted-foreground">
        <tr>
          {#if selectable}
            <th class="w-8 px-3 py-2 text-center"></th>
          {/if}
          {#each columns as col (col.key)}
            <th class="px-3 py-2" style={col.width ? `width: ${col.width}` : ''}>
              {col.label}
            </th>
          {/each}
          {#if rowActions}
            <th class="w-20 px-3 py-2 text-right">Actions</th>
          {/if}
        </tr>
      </thead>
      <tbody class="divide-y divide-border/40">
        {#each flattenedRows as row (row.id)}
          {@const isSelected = selectedKeys.includes(row.id)}
          <tr class="hover:bg-muted/30 transition-colors {isSelected ? 'bg-primary/5' : ''}">
            {#if selectable}
              <td class="w-8 px-3 py-2 text-center">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(row.record)}
                  aria-label="Select {row.id}"
                />
              </td>
            {/if}

            {#each columns as col, colIdx (col.key)}
              {@const val = row.record[col.key]}
              <td class="px-3 py-2">
                {#if colIdx === 0}
                  <!-- Primary tree node column with indent -->
                  <div
                    class="flex items-center gap-1.5"
                    style="padding-left: {row.level * 20}px;"
                  >
                    {#if row.hasChildren}
                      <button
                        type="button"
                        class="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        onclick={() => toggleExpand(row.id)}
                        aria-label={row.isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {#if row.isExpanded}
                          <ChevronDown class="h-3.5 w-3.5" />
                        {:else}
                          <ChevronRight class="h-3.5 w-3.5" />
                        {/if}
                      </button>
                      <Folder class="h-3.5 w-3.5 text-primary/70 shrink-0" />
                    {:else}
                      <span class="w-5 inline-block"></span>
                      <File class="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    {/if}

                    <span class="font-medium text-foreground truncate">
                      {val ?? '—'}
                    </span>
                  </div>
                {:else if customCell}
                  {@render customCell({ column: col, record: row.record, value: val })}
                {:else}
                  <span class="text-foreground truncate">{val ?? '—'}</span>
                {/if}
              </td>
            {/each}

            {#if rowActions}
              <td class="w-20 px-3 py-2 text-right">
                {@render rowActions({ record: row.record, id: row.id })}
              </td>
            {/if}
          </tr>
        {:else}
          <tr>
            <td colspan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} class="py-8 text-center text-muted-foreground">
              No data available
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
