<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import { captureAdminContext, captureAuthSession } from '@svadmin/core';
  import AutoTable from './AutoTable.svelte';
  import SvarDataGrid from './SvarDataGrid.svelte';
  export type SvarAutoTableProps = Omit<ComponentProps<typeof AutoTable>, 'gridBody'> & {
    Grid: ComponentProps<typeof SvarDataGrid>['Grid'];
    Theme: ComponentProps<typeof SvarDataGrid>['Theme'];
    height?: number;
    freezeLeft?: number;
    freezeRight?: number;
  };
  let { Grid, Theme, height = 420, freezeLeft = 0, freezeRight = 0, ...props }: SvarAutoTableProps = $props();
  const context = captureAdminContext();
  const owner = $derived.by(() => {
    const auth = captureAuthSession(context.authProvider);
    return { resource: props.resourceName, contract: context.getResource(props.resourceName).contract,
      provider: context.getDataProviderForResource(props.resourceName), access: context.accessControlProvider,
      tenant: context.tenantCacheKey?.__svadminTenant, authKey: auth.cacheKey, available: auth.available };
  });
</script>

{#key owner}
  {#if owner.available}
    <AutoTable {...props}>
      {#snippet gridBody(state)}
        <details><summary>{state.locale.startsWith('zh') ? '表格选择与列顺序' : 'Selection and column order'}</summary>{@render state.controls()}</details>
        <SvarDataGrid {Grid} {Theme} items={state.records} columns={state.columns} primaryKey={state.primaryKey}
          {height} freezeLeft={Math.min(freezeLeft, state.columns.length - Math.min(freezeRight, state.columns.length - 1))}
          freezeRight={Math.min(freezeRight, state.columns.length - 1)} density={state.density}
          queryMode="server" sorters={state.sorters} onSortChange={state.onSortChange}
          disabled={state.disabled} scopeKey={state.scopeKey} locale={state.locale} label={state.label}>
          {#snippet cellContent({ id, field })}{@render state.cell({ id, field })}{/snippet}
        </SvarDataGrid>
        {@render state.after()}
      {/snippet}
    </AutoTable>
  {/if}
{/key}
