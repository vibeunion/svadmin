<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import type BusinessShowPage from './BusinessShowPage.svelte';
  import { useTranslation } from '@svadmin/core/i18n';

  let props: ComponentProps<typeof BusinessShowPage> = $props();
  const i18n = useTranslation();
  let page = $state.raw(import('./BusinessShowPage.svelte'));
</script>

{#await page}
  <p role="status" aria-live="polite">{i18n.t('common.loading')}</p>
{:then module}
  <module.default {...props} />
{:catch}
  <div role="alert">
    <p>{i18n.t('common.operationFailed')}</p>
    <button type="button" onclick={() => page = import('./BusinessShowPage.svelte')}>
      {i18n.t('common.retry')}
    </button>
  </div>
{/await}
