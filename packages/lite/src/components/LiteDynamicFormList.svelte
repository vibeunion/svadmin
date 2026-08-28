<script lang="ts" generics="T = Record<string, unknown>">
  import type { Snippet } from 'svelte';
  import { t } from '@svadmin/core/i18n';

  interface Props {
    items?: T[];
    name?: string;
    label?: string;
    description?: string;
    addButtonLabel?: string;
    minItems?: number;
    maxItems?: number;
    defaultItem?: T | (() => T);
    disabled?: boolean;
    emptyText?: string;
    children?: Snippet<[{
      item: T;
      index: number;
      isFirst: boolean;
      isLast: boolean;
    }]>;
    headerExtra?: Snippet<[{ count: number }]>;
  }

  let {
    items = [],
    name = 'items',
    label,
    description,
    addButtonLabel = '+ Add Item',
    minItems = 0,
    maxItems = Infinity,
    disabled = false,
    emptyText = 'No items yet',
    children,
    headerExtra,
  }: Props = $props();

  const renderedItems = $derived(items.length > 0 ? items : (minItems > 0 ? Array(minItems).fill({}) as T[] : []));
</script>

<div class="lite-dynamic-form-list lite-form-group">
  <div class="lite-dynamic-header">
    <div>
      {#if label}
        <span class="lite-label">{label}</span>
      {/if}
      {#if description}
        <p class="lite-help-text">{description}</p>
      {/if}
    </div>
    <div class="lite-dynamic-actions">
      {#if headerExtra}
        {@render headerExtra({ count: renderedItems.length })}
      {/if}
      <span class="lite-badge">{renderedItems.length} {t('common.items') || 'items'}</span>
    </div>
  </div>

  {#if renderedItems.length === 0}
    <div class="lite-empty-box">
      <p>{emptyText}</p>
    </div>
  {:else}
    <div class="lite-dynamic-items">
      {#each renderedItems as item, idx (idx)}
        <div class="lite-dynamic-item-card">
          <div class="lite-dynamic-item-header">
            <span class="lite-badge lite-badge-indigo">#{idx + 1}</span>
            <div class="lite-dynamic-item-tools">
              {#if idx > 0}
                <button type="submit" name="_action" value="move_up_{name}_{idx}" class="lite-btn lite-btn-sm" {disabled} title="Move Up">↑</button>
              {/if}
              {#if idx < renderedItems.length - 1}
                <button type="submit" name="_action" value="move_down_{name}_{idx}" class="lite-btn lite-btn-sm" {disabled} title="Move Down">↓</button>
              {/if}
              {#if renderedItems.length > minItems}
                <button type="submit" name="_action" value="remove_{name}_{idx}" class="lite-btn lite-btn-sm lite-btn-danger" {disabled} title="Remove">✕</button>
              {/if}
            </div>
          </div>
          <div class="lite-dynamic-item-body">
            {#if children}
              {@render children({
                item,
                index: idx,
                isFirst: idx === 0,
                isLast: idx === renderedItems.length - 1,
              })}
            {:else}
              <div class="lite-form-row">
                {#each Object.entries((item as Record<string, unknown>) ?? {}) as [k, v] (k)}
                  <div class="lite-form-group" style="flex: 1; min-width: 140px;">
                    <label class="lite-label" for="{name}_{idx}_{k}">{k}</label>
                    <input
                      type="text"
                      id="{name}_{idx}_{k}"
                      name="{name}[{idx}][{k}]"
                      value={String(v ?? '')}
                      class="lite-input"
                      {disabled}
                    />
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if renderedItems.length < maxItems && !disabled}
    <div style="margin-top: 10px;">
      <button type="submit" name="_action" value="add_{name}" class="lite-btn">
        {addButtonLabel}
      </button>
    </div>
  {/if}
</div>

<style>
  .lite-dynamic-form-list {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 14px;
    background-color: #fafafa;
    margin-bottom: 16px;
  }
  .lite-dynamic-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .lite-dynamic-items {
    display: flex;
    flex-direction: column;
  }
  .lite-dynamic-item-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 10px;
  }
  .lite-dynamic-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    border-bottom: 1px dashed #e2e8f0;
    padding-bottom: 6px;
  }
  .lite-dynamic-item-tools {
    display: flex;
  }
  .lite-dynamic-item-tools button {
    margin-left: 4px;
  }
  .lite-empty-box {
    text-align: center;
    padding: 24px 12px;
    color: #64748b;
    background: #ffffff;
    border: 1px dashed #cbd5e1;
    border-radius: 4px;
  }
</style>
