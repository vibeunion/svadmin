<script module lang="ts">
  import type { ComponentProps } from 'svelte';
  import type AutoTable from './AutoTable.svelte';
  export interface LazyAutoTableProps extends ComponentProps<typeof AutoTable> {
    resourceName: ComponentProps<typeof AutoTable>['resourceName'];
  }
</script>

<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';

  let props: LazyAutoTableProps = $props();
  const i18n = useTranslation();
  let page = $state.raw(import('./AutoTable.svelte'));
</script>

{#await page}
  <p role="status" aria-live="polite">{i18n.t('common.loading')}</p>
{:then module}
  <module.default {...props} />
{:catch}
  <div role="alert">
    <p>{i18n.t('common.operationFailed')}</p>
    <button type="button" onclick={() => page = import('./AutoTable.svelte')}>
      {i18n.t('common.retry')}
    </button>
  </div>
{/await}
