<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    items?: Record<string, unknown>[];
    selectedId?: string | number;
    idKey?: string;
    titleKey?: string;
    detailSnippet?: Snippet<[Record<string, unknown>]>;
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let {
    items = [],
    selectedId,
    idKey = 'id',
    titleKey = 'title',
    detailSnippet,
    class: className = '',
  }: Props = $props();

  const activeItem = $derived(
    items.find((i) => String(i[idKey]) === String(selectedId)) ?? items[0]
  );
</script>

<div class="lite-master-detail-card {className}">
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
            {item[titleKey] ?? item['name'] ?? `Item #${item[idKey]}`}
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
          <h4 style="margin: 0 0 12px 0;">{activeItem[titleKey] ?? activeItem['name'] ?? `Item #${activeItem[idKey]}`}</h4>
          <table class="lite-table">
            <tbody>
              {#each Object.entries(activeItem) as [k, v] (k)}
                <tr>
                  <th style="width: 30%; text-align: left; background: #F7F8FA;">{k}</th>
                  <td>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {:else}
      <div style="color: #86909C; padding: 24px; text-align: center;">
        Select an item to view details
      </div>
    {/if}
  </div>
</div>

<style>
  .lite-master-detail-card {
    display: flex;
    background: #ffffff;
    border: 1px solid #E5E6EB;
    border-radius: 6px;
    margin-bottom: 16px;
    min-height: 320px;
  }
  .lite-master-list {
    flex: 0 0 240px;
    border-right: 1px solid #E5E6EB;
    background: #F7F8FA;
  }
  .lite-master-header {
    padding: 10px 12px;
    border-bottom: 1px solid #E5E6EB;
    font-size: 12px;
  }
  .lite-master-items {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .lite-master-item {
    border-bottom: 1px solid #F2F3F5;
  }
  .lite-master-item-active {
    background: #E8F3FF;
    font-weight: bold;
  }
  .lite-master-link {
    display: block;
    padding: 8px 12px;
    color: #1D2129;
    text-decoration: none;
    font-size: 12px;
  }
  .lite-detail-pane {
    flex: 1 1 auto;
    padding: 16px;
  }
</style>
