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

<div class={cn('svadmin-u-6da6a3c3f741 svadmin-u-6f7e013d6499', className)}>
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-d8e0e382c67b svadmin-u-660d2effb880 svadmin-u-359090c2d529">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
      <Button variant="ghost" size="sm" class="svadmin-u-f6fe902450dc svadmin-u-d5eab218aa34 svadmin-u-359090c2d529" onclick={expandAll}>
        Expand All
      </Button>
      <Button variant="ghost" size="sm" class="svadmin-u-f6fe902450dc svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-bfa603190748" onclick={collapseAll}>
        Collapse All
      </Button>
    </div>
    {#if selectable && selectedKeys.length > 0}
      <span class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">
        Selected: <strong class="svadmin-u-d4108abe6359">{selectedKeys.length}</strong>
      </span>
    {/if}
  </div>

  <div class="svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-c9ed8c5f79ae svadmin-u-2cd02d11d1af svadmin-u-cd0ad9a56558">
    <table class="svadmin-u-6da6a3c3f741 svadmin-u-2eba0d65d059 svadmin-u-359090c2d529 svadmin-u-4583f90cd9bd">
      <thead class="svadmin-u-358af0b65a31 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-e83a7042bc91 svadmin-u-bfa603190748">
        <tr>
          {#if selectable}
            <th class="svadmin-u-2bbcfc3b5179 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-ca6bf63030aa"></th>
          {/if}
          {#each columns as col (col.key)}
            <th class="svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b" style={col.width ? `width: ${col.width}` : ''}>
              {col.label}
            </th>
          {/each}
          {#if rowActions}
            <th class="svadmin-u-ed831a4dff32 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-308fc069e46e">Actions</th>
          {/if}
        </tr>
      </thead>
      <tbody class="svadmin-u-fa6acbf81d74 svadmin-u-08b5607c7258">
        {#each flattenedRows as row (row.id)}
          {@const isSelected = selectedKeys.includes(row.id)}
          <tr class="svadmin-u-12251b8f1749 svadmin-u-ceb69a6b0e5f {isSelected ? 'svadmin-u-989c466fdbe7' : ''}">
            {#if selectable}
              <td class="svadmin-u-2bbcfc3b5179 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-ca6bf63030aa">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(row.record)}
                  aria-label="Select {row.id}"
                />
              </td>
            {/if}

            {#each columns as col, colIdx (col.key)}
              {@const val = row.record[col.key]}
              <td class="svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b">
                {#if colIdx === 0}
                  <!-- Primary tree node column with indent -->
                  <div
                    class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568"
                    style="padding-left: {row.level * 20}px;"
                  >
                    {#if row.hasChildren}
                      <button
                        type="button"
                        class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-07389a777c1f svadmin-u-8e551981c8d7 svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e svadmin-u-ceb69a6b0e5f"
                        onclick={() => toggleExpand(row.id)}
                        aria-label={row.isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {#if row.isExpanded}
                          <ChevronDown class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
                        {:else}
                          <ChevronRight class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
                        {/if}
                      </button>
                      <Folder class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-96747a728556 svadmin-u-012fbd121f37" />
                    {:else}
                      <span class="svadmin-u-72470489ff4e svadmin-u-bb0c4bfc52bd"></span>
                      <File class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-3a33f11548cd svadmin-u-012fbd121f37" />
                    {/if}

                    <span class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-f283ea9bea0e">
                      {val ?? '—'}
                    </span>
                  </div>
                {:else if customCell}
                  {@render customCell({ column: col, record: row.record, value: val })}
                {:else}
                  <span class="svadmin-u-d4108abe6359 svadmin-u-f283ea9bea0e">{val ?? '—'}</span>
                {/if}
              </td>
            {/each}

            {#if rowActions}
              <td class="svadmin-u-ed831a4dff32 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-308fc069e46e">
                {@render rowActions({ record: row.record, id: row.id })}
              </td>
            {/if}
          </tr>
        {:else}
          <tr>
            <td colspan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} class="svadmin-u-a1f611f027dd svadmin-u-ca6bf63030aa svadmin-u-bfa603190748">
              No data available
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
