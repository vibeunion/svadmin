<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import MemberDirectory, { type MemberDirectoryProvider } from './MemberDirectory.svelte';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  let { memberProvider }: { memberProvider?: MemberDirectoryProvider } = $props();
  const i18n = useTranslation();
</script>
<ContentPageShell pageId="account-team-members" width="wide">
  <ContentPageHeader title={i18n.t('account.teamMembers')} />
  <MemberDirectory provider={memberProvider} />
</ContentPageShell>
