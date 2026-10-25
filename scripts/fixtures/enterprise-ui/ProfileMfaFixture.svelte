<script lang="ts">
  import {
    provideAdminContext,
    type AuthProvider,
    type DataProvider,
  } from '@svadmin/core';
  import ProfilePage from '../../../packages/ui/src/components/ProfilePage.svelte';
  import TwoFactorAuthPage, { type MfaEnrollmentProvider } from '../../../packages/ui/src/components/TwoFactorAuthPage.svelte';

  const view = new URLSearchParams(window.location.search).get('view');
  let savedName = 'Ada Lovelace';
  let failNextProfile = $state(false);
  let failNextPassword = $state(false);
  let failNextBegin = $state(false);
  let failNextVerify = $state(false);
  let feedback = $state('');
  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };
  const authProvider: AuthProvider = {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    getIdentity: async () => ({ id: 'user-1', name: savedName, email: 'ada@example.com' }),
    updateProfile: async ({ name }) => {
      if (failNextProfile) {
        failNextProfile = false;
        throw new Error('PRIVATE_PROFILE_FIXTURE');
      }
      if (typeof name === 'string') savedName = name;
      return { success: true };
    },
    updatePassword: async ({ currentPassword, password, confirmPassword }) => {
      if (currentPassword !== 'old-password' || password !== 'New-password-123' || confirmPassword !== password) {
        throw new Error('PRIVATE_PASSWORD_ARGUMENT_FIXTURE');
      }
      if (failNextPassword) {
        failNextPassword = false;
        throw new Error('PRIVATE_PASSWORD_FIXTURE');
      }
      return { success: true };
    },
  };
  const enrollmentProvider: MfaEnrollmentProvider = {
    begin: async () => {
      if (failNextBegin) {
        failNextBegin = false;
        throw new Error('PRIVATE_MFA_BEGIN_FIXTURE');
      }
      return { secret: 'JBSWY3DPEHPK3PXP' };
    },
    verify: async (code) => {
      if (code !== '123456') throw new Error('PRIVATE_MFA_CODE_FIXTURE');
      if (failNextVerify) {
        failNextVerify = false;
        throw new Error('PRIVATE_MFA_VERIFY_FIXTURE');
      }
      return { recoveryCodes: ['recovery-1', 'recovery-2'] };
    },
  };
  provideAdminContext({
    dataProvider,
    authProvider,
    notificationProvider: {
      open: (notification) => { feedback = notification.message; },
      close: () => {},
    },
  });
</script>

{#if view === 'mfa'}
  <div data-testid="mfa-page"><TwoFactorAuthPage {enrollmentProvider} /></div>
  <aside aria-label="Fixture controls">
    <button type="button" onclick={() => failNextBegin = true}>Fail next begin</button>
    <button type="button" onclick={() => failNextVerify = true}>Fail next verify</button>
  </aside>
{:else}
  <div data-testid="profile-page"><ProfilePage /></div>
  <aside aria-label="Fixture controls">
    <button type="button" onclick={() => failNextProfile = true}>Fail next profile</button>
    <button type="button" onclick={() => failNextPassword = true}>Fail next password</button>
    <p role="status">{feedback}</p>
  </aside>
{/if}
