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

<div class={cn('svadmin-u-6ed543e2fbbb svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-8e63407b5ceb svadmin-u-cef5b893cf23 svadmin-u-359090c2d529', className)}>
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-f4cc511ff0c1 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
    <div class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">
      Editable Grid <span class="svadmin-u-bfa603190748 svadmin-u-8ecebc9f80e6">({data.length} records)</span>
    </div>

    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
      {#if allowAdd}
        <Button variant="outline" size="sm" class="svadmin-u-ed8a5df7b2fb svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={handleAddRow}>
          <Plus class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
          Add Row
        </Button>
      {/if}
      {#if onsave}
        <Button size="sm" class="svadmin-u-ed8a5df7b2fb svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421 svadmin-u-2e7a6d18a20d" disabled={isSaving} onclick={handleSave}>
          {#if isSaving}
            <Loader2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-afbdd13a380e" />
          {:else}
            <Save class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
          {/if}
          Save All
        </Button>
      {/if}
    </div>
  </div>

  <div class="svadmin-u-1384f66f41d0 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff">
    <table class="svadmin-u-6da6a3c3f741 svadmin-u-2eba0d65d059 svadmin-u-4583f90cd9bd">
      <thead class="svadmin-u-b00f43c30c2b svadmin-u-e83a7042bc91 svadmin-u-bfa603190748 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
        <tr>
          {#each columns as col (col.key)}
            <th style={col.width ? `width: ${col.width};` : ''} class="svadmin-u-0e17f2bd9074 svadmin-u-e7ee55ac7ffe">
              {col.label}
              {#if col.required}<span class="svadmin-u-811148b13d1e">*</span>{/if}
            </th>
          {/each}
          {#if allowDelete}
            <th class="svadmin-u-e7e371071bc5 svadmin-u-0e17f2bd9074 svadmin-u-e7ee55ac7ffe svadmin-u-ca6bf63030aa">Action</th>
          {/if}
        </tr>
      </thead>
      <tbody class="svadmin-u-fa6acbf81d74 svadmin-u-08b5607c7258">
        {#each data as row, rowIndex (row[rowKey] ?? rowIndex)}
          <tr class="svadmin-u-c4b5eaba40e3 svadmin-u-ceb69a6b0e5f">
            {#each columns as col (col.key)}
              <td class="svadmin-u-cd009d7d208c">
                {#if col.readonly}
                  <div class="svadmin-u-d5eab218aa34 svadmin-u-660d2effb880 svadmin-u-bfa603190748 svadmin-u-0e65706bcccd svadmin-u-f283ea9bea0e">{row[col.key] ?? '—'}</div>
                {:else if col.type === 'select' && col.options}
                  <select
                    class="svadmin-u-d1c57777d8b6 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
                    value={String(row[col.key] ?? '')}
                    onchange={(e) => updateCell(rowIndex, col.key, e.currentTarget.value)}
                  >
                    {#each col.options as opt (opt.value)}
                      <option value={String(opt.value)}>{opt.label}</option>
                    {/each}
                  </select>
                {:else if col.type === 'boolean'}
                  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-660d2effb880">
                    <input
                      type="checkbox"
                      class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-07389a777c1f svadmin-u-18049387f0af svadmin-u-20aaf08a7ed1 svadmin-u-4df2b13689a4 svadmin-u-34516836730d"
                      checked={Boolean(row[col.key])}
                      onchange={(e) => updateCell(rowIndex, col.key, e.currentTarget.checked)}
                    />
                  </div>
                {:else if col.type === 'number'}
                  <input
                    type="number"
                    class="svadmin-u-d1c57777d8b6 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
                    value={Number(row[col.key] ?? 0)}
                    oninput={(e) => updateCell(rowIndex, col.key, Number(e.currentTarget.value))}
                  />
                {:else if col.type === 'date'}
                  <input
                    type="date"
                    class="svadmin-u-d1c57777d8b6 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
                    value={String(row[col.key] ?? '')}
                    oninput={(e) => updateCell(rowIndex, col.key, e.currentTarget.value)}
                  />
                {:else}
                  <input
                    type="text"
                    class="svadmin-u-d1c57777d8b6 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a"
                    value={String(row[col.key] ?? '')}
                    oninput={(e) => updateCell(rowIndex, col.key, e.currentTarget.value)}
                  />
                {/if}
              </td>
            {/each}

            {#if allowDelete}
              <td class="svadmin-u-cd009d7d208c svadmin-u-ca6bf63030aa">
                <Button
                  variant="ghost"
                  size="sm"
                  class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-8a539c7fe216 svadmin-u-bfa603190748 svadmin-u-51e95020d6f2 svadmin-u-8db899b4e072"
                  onclick={() => handleDeleteRow(rowIndex)}
                >
                  <Trash2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
                </Button>
              </td>
            {/if}
          </tr>
        {/each}

        {#if data.length === 0}
          <tr>
            <td colspan={columns.length + (allowDelete ? 1 : 0)} class="svadmin-u-a1f611f027dd svadmin-u-ca6bf63030aa svadmin-u-bfa603190748">
              No rows. Click "Add Row" to create the first record.
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
