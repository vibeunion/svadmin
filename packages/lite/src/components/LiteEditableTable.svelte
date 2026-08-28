<script lang="ts">
  interface LiteEditableTableColumn {
    key: string;
    label: string;
    type?: 'text' | 'number' | 'select' | 'boolean' | 'date';
    options?: Array<{ label: string; value: string | number }>;
  }

  interface Props {
    columns: LiteEditableTableColumn[];
    data?: Record<string, unknown>[];
    action?: string;
    method?: 'get' | 'post' | 'dialog' | 'GET' | 'POST' | 'DIALOG' | null;
    rowKey?: string;
  }

  let {
    columns,
    data = [],
    action = '',
    method = 'POST',
    rowKey = 'id',
  }: Props = $props();
</script>

<div class="lite-editable-table-card">
  <form {action} {method}>
    <table class="lite-table">
      <thead>
        <tr>
          {#each columns as col (col.key)}
            <th>{col.label}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each data as row, rowIndex (row[rowKey] ?? rowIndex)}
          <tr>
            {#each columns as col (col.key)}
              <td>
                {#if col.type === 'select' && col.options}
                  <select name="{col.key}_{rowIndex}" class="lite-select">
                    {#each col.options as opt (opt.value)}
                      <option value={String(opt.value)} selected={String(row[col.key]) === String(opt.value)}>
                        {opt.label}
                      </option>
                    {/each}
                  </select>
                {:else if col.type === 'boolean'}
                  <input type="checkbox" name="{col.key}_{rowIndex}" checked={Boolean(row[col.key])} />
                {:else if col.type === 'number'}
                  <input type="number" name="{col.key}_{rowIndex}" value={Number(row[col.key] ?? 0)} class="lite-input" />
                {:else}
                  <input type="text" name="{col.key}_{rowIndex}" value={String(row[col.key] ?? '')} class="lite-input" />
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>

    <div class="lite-editable-actions">
      <button type="submit" class="lite-btn lite-btn-primary lite-btn-sm">
        Save All Changes
      </button>
    </div>
  </form>
</div>

<style>
  .lite-editable-table-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 16px;
  }
  .lite-editable-actions {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
  }
</style>
