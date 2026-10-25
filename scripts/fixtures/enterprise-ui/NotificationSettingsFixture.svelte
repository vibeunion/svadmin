<script lang="ts">
  import { provideAdminContext, type DataProvider } from '@svadmin/core';
  import NotificationsSettings, { type NotificationPreferences, type NotificationPreferencesProvider } from '../../../packages/ui/src/components/NotificationsSettings.svelte';

  const failLoadInitially = new URLSearchParams(window.location.search).has('fail-load');
  let loadAttempts = 0;
  let failNextSave = $state(false);
  let feedback = $state('');
  let saved = $state.raw<NotificationPreferences | null>(null);
  const preferences: NotificationPreferences = {
    email: { security: true, activity: false, reports: true },
    push: { security: true, activity: true, reports: false },
    sms: { security: false },
  };
  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };
  const provider: NotificationPreferencesProvider = {
    load: async () => {
      loadAttempts += 1;
      if (failLoadInitially && loadAttempts === 1) throw new Error('PRIVATE_NOTIFICATION_READ_FIXTURE');
      return structuredClone(preferences);
    },
    save: async next => {
      if (failNextSave) {
        failNextSave = false;
        throw new Error('PRIVATE_NOTIFICATION_SAVE_FIXTURE');
      }
      Object.assign(preferences.email, next.email);
      Object.assign(preferences.push, next.push);
      Object.assign(preferences.sms, next.sms);
      saved = structuredClone(next);
    },
  };
  provideAdminContext({
    dataProvider,
    notificationProvider: {
      open: notification => { feedback = notification.message; },
      close: () => {},
    },
  });
</script>

<div data-testid="notifications-page"><NotificationsSettings preferencesProvider={provider} /></div>
<aside aria-label="Fixture controls">
  <button type="button" onclick={() => { feedback = ''; failNextSave = true; }}>Fail next save</button>
  <p role="status">{feedback}</p>
  <pre data-testid="saved-preferences">{JSON.stringify(saved)}</pre>
</aside>
