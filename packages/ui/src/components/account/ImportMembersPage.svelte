<script lang="ts">
  import { captureAdminContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import ImportWizard from '../ImportWizard.svelte';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import FeedbackNotice from '../content/FeedbackNotice.svelte';
  import { Button } from '../ui/button/index.js';
  import { Upload } from '@lucide/svelte';

  let { resourceName = 'users' }: { resourceName?: string } = $props();
  const context = captureAdminContext();
  const i18n = useTranslation();
  const resource = $derived(context.resources.find(item => item.name === resourceName));
  const available = $derived(resource && resource.canCreate !== false);
  let open = $state(false);
  let result = $state<{ succeeded: number; failed: number } | null>(null);
  $effect(() => { void resourceName; void context.authProvider; void context.tenantCacheKey; open = false; result = null; });
</script>

<ContentPageShell pageId="account-import-members" width="wide">
  <ContentPageHeader title={i18n.t('account.importMembers')} />
  <p>{i18n.locale === 'zh-CN' ? '导入成员记录到所配置的数据源；不会自动发送邀请或欢迎邮件。' : 'Import member records into the configured data source. Invitations and welcome emails are not sent automatically.'}</p>
  {#if available}
    <Button onclick={() => open = true}><Upload size={16} />{i18n.t('common.import')}</Button>
    <ImportWizard {resourceName} bind:open onSuccess={(value) => result = value} />
    {#if result}<p role="status">{i18n.locale === 'zh-CN' ? '成功 / 失败' : 'Succeeded / failed'}: {result.succeeded} / {result.failed}</p>{/if}
  {:else}
    <FeedbackNotice tone="warning" message={i18n.locale === 'zh-CN' ? '未配置可导入的成员资源。' : 'No importable member resource is configured.'} />
  {/if}
</ContentPageShell>
