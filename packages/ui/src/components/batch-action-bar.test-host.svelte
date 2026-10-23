<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
  import BatchActionBar from './BatchActionBar.svelte';
  import TestI18nScopeHost from '../../test/fixtures/TestI18nScopeHost.svelte';

  let {
    pending = false, selectedCount = 2, variant = 'default',
    selectedLabel, clearLabel, ariaLabel, pendingLabel,
    onclear, onaction, onsubmit,
  }: {
    pending?: boolean;
    selectedCount?: number;
    variant?: 'default' | 'floating' | 'subtle';
    selectedLabel?: string;
    clearLabel?: string;
    ariaLabel?: string;
    pendingLabel?: string;
    onclear: () => void;
    onaction: () => void;
    onsubmit: () => void;
  } = $props();
  let scope: TestI18nScopeHost;
  export async function setLocale(locale: string) {
    await scope.setLocale(locale);
  }
</script>

<TestI18nScopeHost bind:this={scope}>
  <form onsubmit={event => { event.preventDefault(); onsubmit(); }}>
    <BatchActionBar {pending} {selectedCount} {variant} totalCount={10} {onclear}
      {...definedOptions({ selectedLabel, clearLabel, ariaLabel, pendingLabel })}>
      {#snippet actions()}<button type="button" onclick={onaction}>Apply</button>{/snippet}
      <button type="button" onclick={onaction}>Archive</button>
    </BatchActionBar>
  </form>
</TestI18nScopeHost>
