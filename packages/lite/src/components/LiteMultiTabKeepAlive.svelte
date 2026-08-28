<script lang="ts">
  export interface WorkspaceTab {
    id: string;
    title: string;
    path: string;
    closable?: boolean;
    pinned?: boolean;
  }

  interface Props {
    tabs?: WorkspaceTab[];
    activeTabId?: string;
    class?: string;
  }

  let {
    tabs = [],
    activeTabId = '',
    class: className = '',
  }: Props = $props();
</script>

<div class="sv-lite-tab-bar {className}">
  <div class="sv-lite-tab-list">
    {#each tabs as tab (tab.id)}
      {@const isActive = tab.id === activeTabId}
      <a
        href={tab.path}
        class="sv-lite-tab {isActive ? 'sv-lite-tab-active' : ''}"
      >
        {#if tab.pinned}
          <span class="sv-lite-pin-icon">📌</span>
        {/if}
        <span class="sv-lite-tab-title">{tab.title}</span>
      </a>
    {/each}
  </div>
</div>

<style>
  .sv-lite-tab-bar {
    display: block;
    background-color: #f1f5f9;
    border-bottom: 1px solid #cbd5e1;
    padding: 4px 8px 0 8px;
    font-size: 12px;
  }
  .sv-lite-tab-list {
    white-space: nowrap;
    overflow-x: auto;
  }
  .sv-lite-tab {
    display: inline-block;
    padding: 6px 12px;
    margin-right: 4px;
    background-color: #e2e8f0;
    color: #475569;
    text-decoration: none;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    border: 1px solid #cbd5e1;
    border-bottom: none;
    font-weight: 500;
  }
  .sv-lite-tab-active {
    background-color: #ffffff;
    color: #0f172a;
    font-weight: 600;
    border-bottom: 1px solid #ffffff;
    margin-bottom: -1px;
  }
  .sv-lite-pin-icon {
    font-size: 10px;
    margin-right: 4px;
  }
  .sv-lite-tab-title {
    vertical-align: middle;
  }
</style>
