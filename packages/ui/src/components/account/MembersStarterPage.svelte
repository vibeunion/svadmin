<script lang="ts">
  import { captureAdminContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import MemberDirectory, { type MemberDirectoryProvider } from './MemberDirectory.svelte';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import { Button } from '../ui/button/index.js';
  import { Upload } from '@lucide/svelte';
  let { memberProvider }: { memberProvider?: MemberDirectoryProvider } = $props();
  const context = captureAdminContext();
  const i18n = useTranslation();
</script>
<ContentPageShell pageId="account-members-starter" width="wide">
  <ContentPageHeader title={i18n.locale === 'zh-CN' ? '开始组建团队' : 'Start building your team'} />
  <MemberDirectory provider={memberProvider} />
  <Button variant="outline" onclick={() => context.navigate('/account/members/import-members')}><Upload size={16} />{i18n.t('common.import')}</Button>
</ContentPageShell>
