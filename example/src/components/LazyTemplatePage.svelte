<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';

  let { route = '/templates/workplace' }: { route?: string } = $props();

  const i18n = useTranslation();
  const loader = () => import('../features/templates/index.js').then((module) => module.loadTemplateGalleryPage());
  let page = $state.raw(loader());
</script>

{#await page}
  <p role="status" aria-live="polite">{i18n.t('common.loading')}</p>
{:then module}
  <module.default {route} standalone />
{:catch}
  <div role="alert">
    <p>{i18n.t('common.operationFailed')}</p>
    <button type="button" onclick={() => (page = loader())}>{i18n.t('common.retry')}</button>
  </div>
{/await}
