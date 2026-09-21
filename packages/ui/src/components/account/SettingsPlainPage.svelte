<script lang="ts">
  import ProfilePage from '../ProfilePage.svelte';
  import NotificationsSettings from '../NotificationsSettings.svelte';
  import SecuritySettings from '../SecuritySettings.svelte';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  let { preferencesProvider }: { preferencesProvider?: import('../NotificationsSettings.svelte').NotificationPreferencesProvider } = $props();
</script>

<ContentPageShell pageId="account-settings-plain" width="narrow">
  <ProfilePage />
  <NotificationsSettings {...preferencesProvider ? { preferencesProvider } : {}} />
  <SecuritySettings />
</ContentPageShell>
