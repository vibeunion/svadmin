<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import type BusinessAutoForm from './BusinessAutoForm.svelte';
  import { useTranslation } from '@svadmin/core/i18n';

  let props: ComponentProps<typeof BusinessAutoForm> = $props();
  const i18n = useTranslation();
  let page = $state.raw(import('./BusinessAutoForm.svelte'));
</script>

{#await page}
  <p role="status" aria-live="polite">{i18n.t('common.loading')}</p>
{:then module}
  <module.default {...props} />
{:catch}
  <div role="alert">
    <p>{i18n.t('common.operationFailed')}</p>
    <button type="button" onclick={() => page = import('./BusinessAutoForm.svelte')}>
      {i18n.t('common.retry')}
    </button>
  </div>
{/await}
