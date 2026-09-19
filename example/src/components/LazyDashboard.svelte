<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';

  const i18n = useTranslation();
  // 登录页不需要下载仪表盘；保持原生组件类型，不经过无类型 props 转发。
  let dashboard = $state.raw(import('../pages/Dashboard.svelte'));
</script>

{#await dashboard}
  <p role="status" aria-live="polite">{i18n.t('common.loading')}</p>
{:then module}
  <module.default />
{:catch}
  <div role="alert">
    <p>{i18n.t('common.operationFailed')}</p>
    <button type="button" onclick={() => dashboard = import('../pages/Dashboard.svelte')}>
      {i18n.t('common.retry')}
    </button>
  </div>
{/await}
