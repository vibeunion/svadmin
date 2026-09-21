<script module lang="ts">
  import type { ComponentProps } from 'svelte';
  import type SettingsPage from './SettingsPage.svelte';
  export interface LazySettingsPageProps extends ComponentProps<typeof SettingsPage> {
    preferencesProvider?: NonNullable<ComponentProps<typeof SettingsPage>['preferencesProvider']>;
  }
</script>

<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';

  let props: LazySettingsPageProps = $props();
  const i18n = useTranslation();
  let page = $state.raw(import('./SettingsPage.svelte'));
</script>

{#await page}
  <p role="status" aria-live="polite">{i18n.t('common.loading')}</p>
{:then module}
  <module.default {...props} />
{:catch}
  <div role="alert">
    <p>{i18n.t('common.operationFailed')}</p>
    <button type="button" onclick={() => page = import('./SettingsPage.svelte')}>
      {i18n.t('common.retry')}
    </button>
  </div>
{/await}
