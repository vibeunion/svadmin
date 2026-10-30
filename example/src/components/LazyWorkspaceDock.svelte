<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';

  let { route = '/workspace/dock' }: { route?: string } = $props();

  const i18n = useTranslation();
  const loader = () => import('../features/templates/index.js').then((module) => module.loadWorkspaceDockPage());
  let page = $state.raw(loader());
</script>

<div class="svadmin-lazy-workspace-dock" data-dock-route={route}>
  {#await page}
    <p role="status" aria-live="polite">{i18n.t('common.loading')}</p>
  {:then module}
    <module.default />
  {:catch}
    <div role="alert">
      <p>{i18n.t('common.operationFailed')}</p>
      <button type="button" onclick={() => (page = loader())}>{i18n.t('common.retry')}</button>
    </div>
  {/await}
</div>

<style>
  .svadmin-lazy-workspace-dock { display: contents; }
</style>
