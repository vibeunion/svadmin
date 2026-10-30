<script lang="ts">
  interface StatusTab {
    id: string;
    label: string;
    count?: number;
    href: string;
    active?: boolean;
  }

  interface Props {
    tabs: StatusTab[];
    label?: string;
  }

  let { tabs, label = 'Status tabs' }: Props = $props();
</script>

<nav class="lite-status-tabs" aria-label={label}>
  {#each tabs as tab (tab.id)}
    <a href={tab.href} class:active={tab.active} aria-current={tab.active ? 'page' : undefined}>
      {tab.label}
      {#if tab.count !== undefined}<span class="lite-badge lite-badge-secondary">{tab.count}</span>{/if}
    </a>
  {/each}
</nav>

<style>
  .lite-status-tabs { display: flex; flex-wrap: wrap; border-bottom: 1px solid #E5E6EB; }
  .lite-status-tabs a { display: inline-flex; align-items: center; padding: 8px 12px; border-bottom: 2px solid transparent; color: #4E5969; font-size: 13px; text-decoration: none; }
  .lite-status-tabs a:hover { color: #165DFF; text-decoration: none; }
  .lite-status-tabs a.active { border-bottom-color: #165DFF; color: #165DFF; font-weight: 600; }

  .lite-status-tabs a + a { margin-left: 4px; }
  .lite-status-tabs a > * + * { margin-left: 6px; }
</style>
