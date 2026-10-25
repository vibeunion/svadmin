<script lang="ts">
  import {
    provideAdminContext,
    type AuthProvider,
    type DataProvider,
    type SessionProvider,
  } from '@svadmin/core';
  import SecuritySettings from '../../../packages/ui/src/components/SecuritySettings.svelte';

  const failLoadInitially = new URLSearchParams(window.location.search).has('fail-load');
  let loadAttempts = 0;
  let failNextPassword = $state(false);
  let failNextRevoke = $state(false);
  let revokeCalls = $state(0);
  let feedback = $state('');
  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };
  const sessionProvider: SessionProvider = {
    listSessions: async () => {
      loadAttempts += 1;
      if (failLoadInitially && loadAttempts === 1) throw new Error('PRIVATE_SECURITY_READ_FIXTURE');
      return [
        { id: 'current', current: true, os: 'macOS', browser: 'Safari' },
        { id: 'other', current: false, os: 'Windows', browser: 'Edge' },
      ];
    },
    revokeSession: async () => {
      revokeCalls += 1;
      if (failNextRevoke) {
        failNextRevoke = false;
        throw new Error('PRIVATE_SECURITY_REVOKE_FIXTURE');
      }
      return { success: true };
    },
    revokeOtherSessions: async () => ({ success: true }),
    getMfaState: async () => ({ enabled: true }),
    setMfaEnabled: async (enabled) => ({ enabled }),
  };
  const authProvider: AuthProvider = {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    getIdentity: async () => ({ id: 'user-1' }),
    updatePassword: async () => {
      if (failNextPassword) {
        failNextPassword = false;
        throw new Error('PRIVATE_SECURITY_PASSWORD_FIXTURE');
      }
      return { success: true };
    },
  };
  provideAdminContext({
    dataProvider,
    authProvider,
    sessionProvider,
    notificationProvider: {
      open: (notification) => { feedback = notification.message; },
      close: () => {},
    },
  });
</script>

<div data-testid="security-page"><SecuritySettings /></div>
<aside aria-label="Fixture controls">
  <button type="button" onclick={() => { feedback = ''; failNextPassword = true; }}>Fail next password</button>
  <button type="button" onclick={() => { feedback = ''; failNextRevoke = true; }}>Fail next revoke</button>
  <p role="status">{feedback}</p>
  <p data-testid="revoke-calls">{revokeCalls}</p>
</aside>
