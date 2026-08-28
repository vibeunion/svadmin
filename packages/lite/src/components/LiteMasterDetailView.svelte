<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    items?: Record<string, unknown>[];
    selectedId?: string | number;
    idKey?: string;
    titleKey?: string;
    detailSnippet?: Snippet<[Record<string, unknown>]>;
  }

  let {
    items = [],
    selectedId,
    idKey = 'id',
    titleKey = 'title',
    detailSnippet,
  }: Props = $props();

  const activeItem = $derived(
    items.find((i) => String(i[idKey]) === String(selectedId)) ?? items[0]
  );
</script>

<div class="lite-master-detail-card">
  <!-- Left Master List -->
  <div class="lite-master-list">
    <div class="lite-master-header">
      <strong>Item Directory</strong>
    </div>
    <ul class="lite-master-items">
      {#each items as item (item[idKey])}
        {@const isSelected = String(item[idKey]) === String(activeItem?.[idKey])}
        <li class="lite-master-item {isSelected ? 'lite-master-item-active' : ''}">
          <a href="?selectedId={item[idKey]}" class="lite-master-link">
            {item[titleKey] ?? item.name ?? `Item #${item[idKey]}`}
          </a>
        </li>
      {/each}
    </ul>
  </div>

  <!-- Right Detail View -->
  <div class="lite-detail-pane">
    {#if activeItem}
      {#if detailSnippet}
        {@render detailSnippet(activeItem)}
      {:else}
        <div class="lite-detail-content">
          <h4 style="margin: 0 0 12px 0;">{activeItem[titleKey] ?? activeItem.name ?? `Item #${activeItem[idKey]}`}</h4>
          <table class="lite-table">
            <tbody>
              {#each Object.entries(activeItem) as [k, v] (k)}
                <tr>
                  <th style="width: 30%; text-align: left; background: #f8fafc;">{k}</th>
                  <td>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {:else}
      <div style="color: #94a3b8; padding: 24px; text-align: center;">
        Select an item to view details
      </div>
    {/if}
  </div>
</div>

<style>
  .lite-master-detail-card {
    display: flex;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    margin-bottom: 16px;
    min-height: 320px;
  }
  .lite-master-list {
    flex: 0 0 240px;
    border-right: 1px solid #e2e8f0;
    background: #f8fafc;
  }
  .lite-master-header {
    padding: 10px 12px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 12px;
  }
  .lite-master-items {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .lite-master-item {
    border-bottom: 1px solid #f1f5f9;
  }
  .lite-master-item-active {
    background: #e0e7ff;
    font-weight: bold;
  }
  .lite-master-link {
    display: block;
    padding: 8px 12px;
    color: #1e293b;
    text-decoration: none;
    font-size: 12px;
  }
  .lite-detail-pane {
    flex: 1 1 auto;
    padding: 16px;
  }
</style>
