<script lang="ts">
  import { provideAdminContext, type CredentialProvider, type DataProvider } from '@svadmin/core';
  import ApiSettings from '../../../packages/ui/src/components/ApiSettings.svelte';

  const failLoadInitially = new URLSearchParams(window.location.search).has('fail-load');
  let loadAttempts = 0;
  let failNextCreate = $state(false);
  let failNextRevoke = $state(false);
  let feedback = $state('');
  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };
  const credentialProvider: CredentialProvider = {
    listApiCredentials: async () => {
      loadAttempts += 1;
      if (failLoadInitially && loadAttempts === 1) throw new Error('PRIVATE_API_READ_FIXTURE');
      return [{ id: 'key-1', name: 'Existing key', prefix: 'sv_live_', createdAt: '2026-08-25T00:00:00.000Z', permissions: ['Read'] }];
    },
    createApiCredential: async ({ name, permissions }) => {
      if (failNextCreate) {
        failNextCreate = false;
        throw new Error('PRIVATE_API_CREATE_FIXTURE');
      }
      return {
        credential: { id: 'key-2', name, prefix: 'sv_live_', createdAt: '2026-08-25T00:00:00.000Z', permissions },
        secret: 'sv_live_one_time_secret',
      };
    },
    revokeApiCredential: async () => {
      if (failNextRevoke) {
        failNextRevoke = false;
        throw new Error('PRIVATE_API_REVOKE_FIXTURE');
      }
      return { success: true };
    },
    listWebhooks: async () => [],
    createWebhook: async ({ name, url, eventType }) => ({ id: 'hook-1', name, url, eventType }),
    deleteWebhook: async () => ({ success: true }),
  };
  provideAdminContext({
    dataProvider,
    credentialProvider,
    notificationProvider: {
      open: (notification) => { feedback = notification.message; },
      close: () => {},
    },
  });
</script>

<div data-testid="api-page"><ApiSettings /></div>
<aside aria-label="Fixture controls">
  <button type="button" onclick={() => { feedback = ''; failNextCreate = true; }}>Fail next create</button>
  <button type="button" onclick={() => { feedback = ''; failNextRevoke = true; }}>Fail next revoke</button>
  <p role="status">{feedback}</p>
</aside>
