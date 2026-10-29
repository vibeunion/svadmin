<script lang="ts">
  /**
   * LiteTabs — SSR-compatible tab navigation.
   * Uses simple <a> tags and flexbox. No JS required.
   */

  interface TabItem {
    label: string;
    value: string;
    href: string;
  }

  interface Props {
    items: TabItem[];
    activeValue: string;
  }

  let { items, activeValue }: Props = $props();
</script>

<div class="lite-tabs">
  {#each items as item, _i (_i)}
    <a href={item.href} class="lite-tab {activeValue === item.value ? 'active' : ''}">
      {item.label}
    </a>
  {/each}
</div>

<style>
  .lite-tabs {
    display: flex;
    flex-wrap: wrap;
    border-bottom: 2px solid #E5E6EB;
    margin-bottom: 24px;
    padding-bottom: 0;
  }
  .lite-tab {
    padding: 8px 16px;
    margin-right: 4px;
    font-size: 14px;
    font-weight: 500;
    color: #4E5969;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    text-decoration: none;
    transition: color 0.15s ease, border-color 0.15s ease;
  }
  .lite-tab:hover {
    color: #1D2129;
    text-decoration: none;
  }
  .lite-tab.active {
    color: #165DFF;
    border-bottom-color: #165DFF;
    font-weight: 600;
  }
</style>
