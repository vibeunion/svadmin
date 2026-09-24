<script lang="ts">
  import ProfilePage from '../ProfilePage.svelte';
  import NotificationsSettings from '../NotificationsSettings.svelte';
  import SecuritySettings from '../SecuritySettings.svelte';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  const i18n = useTranslation();
  let { preferencesProvider }: { preferencesProvider?: import('../NotificationsSettings.svelte').NotificationPreferencesProvider } = $props();
</script>

<ContentPageShell pageId="account-settings-plain" width="narrow">
  <ContentPageHeader title={i18n.t('account.settingsPlain')} />
  <ProfilePage headingLevel="h2" />
  <NotificationsSettings headingLevel="h2" {...preferencesProvider ? { preferencesProvider } : {}} />
  <SecuritySettings headingLevel="h2" />
</ContentPageShell>
