<script lang="ts">
  interface LiteDraggableColumn {
    key: string;
    label: string;
  }

  interface Props {
    columns: LiteDraggableColumn[];
    items?: Record<string, unknown>[];
    action?: string;
    method?: 'get' | 'post' | 'dialog' | 'GET' | 'POST' | 'DIALOG' | null;
    rowKey?: string;
  }

  let {
    columns,
    items = [],
    action = '',
    method = 'POST',
    rowKey = 'id',
  }: Props = $props();
</script>

<div class="lite-sortable-table-card">
  <form {action} {method}>
    <table class="lite-table">
      <thead>
        <tr>
          <th style="width: 70px;">Order</th>
          {#each columns as col (col.key)}
            <th>{col.label}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each items as item, index (item[rowKey] ?? index)}
          <tr>
            <td>
              <input type="number" name="order_{item[rowKey] ?? index}" value={index + 1} class="lite-input" style="width: 55px;" />
            </td>
            {#each columns as col (col.key)}
              <td>{item[col.key] ?? '—'}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>

    <div class="lite-sortable-actions">
      <button type="submit" class="lite-btn lite-btn-primary lite-btn-sm">
        Update Order
      </button>
    </div>
  </form>
</div>

<style>
  .lite-sortable-table-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 16px;
  }
  .lite-sortable-actions {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
  }
</style>
