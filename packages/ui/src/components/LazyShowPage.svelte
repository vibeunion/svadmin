<script module lang="ts">
  import type { ComponentProps } from 'svelte';
  import type ShowPage from './ShowPage.svelte';
  export interface LazyShowPageProps extends ComponentProps<typeof ShowPage> {
    resourceName: ComponentProps<typeof ShowPage>['resourceName'];
  }
</script>

<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';

  let props: LazyShowPageProps = $props();
  const i18n = useTranslation();
  let page = $state.raw(import('./ShowPage.svelte'));
</script>

{#await page}
  <p role="status" aria-live="polite">{i18n.t('common.loading')}</p>
{:then module}
  <module.default {...props} />
{:catch}
  <div role="alert">
    <p>{i18n.t('common.operationFailed')}</p>
    <button type="button" onclick={() => page = import('./ShowPage.svelte')}>
      {i18n.t('common.retry')}
    </button>
  </div>
{/await}
