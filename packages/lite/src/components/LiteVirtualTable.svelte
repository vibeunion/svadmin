<script lang="ts">
  interface LiteVirtualTableColumn {
    key: string;
    label: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
  }

  interface Props {
    items?: Record<string, unknown>[];
    columns: LiteVirtualTableColumn[];
    rowKey?: string;
  }

  let {
    items = [],
    columns,
    rowKey = 'id',
  }: Props = $props();
</script>

<div class="lite-table-scroll">
  <table class="lite-table">
    <thead>
      <tr>
        {#each columns as col (col.key)}
          <th style={col.width ? `width: ${col.width}; text-align: ${col.align || 'left'};` : `text-align: ${col.align || 'left'};`}>
            {col.label}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each items as item, index (item[rowKey] ?? index)}
        <tr>
          {#each columns as col (col.key)}
            <td style="text-align: {col.align || 'left'};">
              {item[col.key] ?? '—'}
            </td>
          {/each}
        </tr>
      {/each}
      {#if items.length === 0}
        <tr>
          <td colspan={columns.length} style="text-align: center; color: #94a3b8; padding: 24px;">
            No records to display
          </td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>
