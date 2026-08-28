<script lang="ts">
  import { t } from '@svadmin/core/i18n';

  export interface TransferItem {
    key: string | number;
    title: string;
    description?: string;
    disabled?: boolean;
  }

  interface Props {
    dataSource?: TransferItem[];
    targetKeys?: (string | number)[];
    titles?: [string, string];
    name?: string;
    disabled?: boolean;
    label?: string;
    description?: string;
  }

  let {
    dataSource = [],
    targetKeys = [],
    titles = ['Available', 'Selected'],
    name = 'targetKeys',
    disabled = false,
    label,
    description,
  }: Props = $props();

  const targetKeySet = $derived(new Set(targetKeys.map(String)));
  const sourceItems = $derived(dataSource.filter((item) => !targetKeySet.has(String(item.key))));
  const targetItems = $derived(dataSource.filter((item) => targetKeySet.has(String(item.key))));
</script>

<div class="lite-transfer-container lite-form-group">
  {#if label}
    <span class="lite-label">{label}</span>
  {/if}
  {#if description}
    <p class="lite-help-text">{description}</p>
  {/if}

  <div class="lite-transfer-boxes">
    <!-- Source Box -->
    <div class="lite-transfer-panel">
      <div class="lite-transfer-header">
        <strong>{titles[0]}</strong>
        <span class="lite-badge">{sourceItems.length}</span>
      </div>
      <div class="lite-transfer-body">
        {#if sourceItems.length === 0}
          <div class="lite-transfer-empty">{t('common.empty') || 'No items'}</div>
        {:else}
          {#each sourceItems as item (item.key)}
            <label class="lite-transfer-item">
              <input
                type="checkbox"
                name="_transfer_source_keys"
                value={String(item.key)}
                disabled={disabled || item.disabled}
              />
              <span class="lite-transfer-item-title">{item.title}</span>
            </label>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Move Actions -->
    <div class="lite-transfer-operations">
      <button
        type="submit"
        name="_action"
        value="transfer_to_target"
        class="lite-btn lite-btn-sm lite-btn-primary"
        {disabled}
        title="Move selected right"
      >
        →
      </button>
      <button
        type="submit"
        name="_action"
        value="transfer_to_source"
        class="lite-btn lite-btn-sm"
        {disabled}
        title="Move selected left"
      >
        ←
      </button>
    </div>

    <!-- Target Box -->
    <div class="lite-transfer-panel">
      <div class="lite-transfer-header">
        <strong>{titles[1]}</strong>
        <span class="lite-badge lite-badge-indigo">{targetItems.length}</span>
      </div>
      <div class="lite-transfer-body">
        {#if targetItems.length === 0}
          <div class="lite-transfer-empty">{t('common.empty') || 'No items selected'}</div>
        {:else}
          {#each targetItems as item (item.key)}
            <label class="lite-transfer-item">
              <input
                type="checkbox"
                name="_transfer_target_keys"
                value={String(item.key)}
                disabled={disabled || item.disabled}
              />
              <input type="hidden" {name} value={String(item.key)} />
              <span class="lite-transfer-item-title">{item.title}</span>
            </label>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .lite-transfer-container {
    margin-bottom: 16px;
  }
  .lite-transfer-boxes {
    display: flex;
    align-items: center;
  }
  .lite-transfer-panel {
    flex: 1;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #ffffff;
    min-height: 180px;
    max-height: 280px;
    display: flex;
    flex-direction: column;
  }
  .lite-transfer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 13px;
  }
  .lite-transfer-body {
    flex: 1;
    overflow-y: auto;
    padding: 6px;
  }
  .lite-transfer-item {
    display: flex;
    align-items: center;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  }
  .lite-transfer-item:hover {
    background: #f1f5f9;
  }
  .lite-transfer-item input {
    margin-right: 8px;
  }
  .lite-transfer-operations {
    display: flex;
    flex-direction: column;
    margin: 0 12px;
  }
  .lite-transfer-operations .lite-btn:first-child {
    margin-bottom: 6px;
  }
  .lite-transfer-boxes > .lite-transfer-panel:first-child {
    margin-right: 0;
  }
  .lite-transfer-empty {
    text-align: center;
    padding: 30px 10px;
    color: #94a3b8;
    font-size: 12px;
  }
</style>
