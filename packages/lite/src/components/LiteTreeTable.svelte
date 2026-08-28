<script lang="ts">
  export interface LiteTreeColumn {
    key: string;
    label: string;
  }

  interface Props {
    data: Record<string, unknown>[];
    columns: LiteTreeColumn[];
    primaryKey?: string;
    childrenKey?: string;
  }

  let {
    data = [],
    columns = [],
    primaryKey = 'id',
    childrenKey = 'children',
  }: Props = $props();

  interface FlatLiteItem {
    record: Record<string, unknown>;
    id: string | number;
    level: number;
    hasChildren: boolean;
  }

  function flatten(items: Record<string, unknown>[], level = 0): FlatLiteItem[] {
    const flat: FlatLiteItem[] = [];
    for (const item of items) {
      const id = item[primaryKey] as string | number;
      const children = item[childrenKey] as Record<string, unknown>[] | undefined;
      const hasChildren = Array.isArray(children) && children.length > 0;
      flat.push({ record: item, id, level, hasChildren });
      if (hasChildren && children) {
        flat.push(...flatten(children, level + 1));
      }
    }
    return flat;
  }

  const flattened = $derived(flatten(data));
</script>

<div class="lite-tree-table lite-form-group">
  <table class="lite-table">
    <thead>
      <tr>
        {#each columns as col (col.key)}
          <th>{col.label}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each flattened as row (row.id)}
        <tr>
          {#each columns as col, idx (col.key)}
            <td>
              {#if idx === 0}
                <span style="display: inline-block; padding-left: {row.level * 16}px;">
                  {#if row.level > 0}↳ {/if}
                  {row.record[col.key] ?? '—'}
                </span>
              {:else}
                {row.record[col.key] ?? '—'}
              {/if}
            </td>
          {/each}
        </tr>
      {:else}
        <tr>
          <td colspan={columns.length} style="text-align: center; color: #94a3b8; padding: 24px;">
            No tree data
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .lite-tree-table {
    overflow-x: auto;
  }
</style>
