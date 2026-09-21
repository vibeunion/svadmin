<script module lang="ts">
  import type { ComponentProps } from 'svelte';
  import type AutoForm from './AutoForm.svelte';
  export interface LazyAutoFormProps extends ComponentProps<typeof AutoForm> {
    resourceName: ComponentProps<typeof AutoForm>['resourceName'];
  }
</script>

<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';

  let props: LazyAutoFormProps = $props();
  const i18n = useTranslation();
  let page = $state.raw(import('./AutoForm.svelte'));
</script>

{#await page}
  <p role="status" aria-live="polite">{i18n.t('common.loading')}</p>
{:then module}
  <module.default {...props} />
{:catch}
  <div role="alert">
    <p>{i18n.t('common.operationFailed')}</p>
    <button type="button" onclick={() => page = import('./AutoForm.svelte')}>
      {i18n.t('common.retry')}
    </button>
  </div>
{/await}
