<script lang="ts">
  /**
   * LiteTabs — SSR-compatible tab/segmented navigation.
   *
   * Selection is URL driven: each option is a link and the active one carries
   * `aria-current="page"`. Disabled options render as plain text so they cannot be
   * focused or navigated to, matching the reference `disabled` contract without
   * needing client state.
   */

  interface TabItem {
    label: string;
    value: string;
    href: string;
    disabled?: boolean;
  }

  interface Props {
    items: TabItem[];
    activeValue: string;
    /** Accessible name for the tab list. */
    label?: string;
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let { items, activeValue, label, class: className = '' }: Props = $props();
</script>

<nav class={`lite-tabs ${className}`.trim()} aria-label={label}>
  {#each items as item, _i (_i)}
    {#if item.disabled}
      <span class="lite-tab" aria-disabled="true">{item.label}</span>
    {:else}
      <a
        href={item.href}
        class="lite-tab {activeValue === item.value ? 'active' : ''}"
        aria-current={activeValue === item.value ? 'page' : undefined}
      >
        {item.label}
      </a>
    {/if}
  {/each}
</nav>

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
  }
  .lite-tab:hover { color: #165DFF; text-decoration: none; }
  .lite-tab.active { color: #165DFF; border-bottom-color: #165DFF; }
  .lite-tab[aria-disabled='true'] { color: #C9CDD4; cursor: not-allowed; }
</style>
