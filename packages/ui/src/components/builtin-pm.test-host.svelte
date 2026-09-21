<script lang="ts">
  import { provideAdminContext, type ProviderBundle } from '@svadmin/core';
  import TwoFactorAuthPage, { type MfaEnrollmentProvider } from './TwoFactorAuthPage.svelte';
  import NotificationsSettings, { type NotificationPreferencesProvider } from './NotificationsSettings.svelte';
  import MemberDirectory, { type MemberDirectoryProvider } from './account/MemberDirectory.svelte';
  import CompanyProfilePage from './account/CompanyProfilePage.svelte';
  import PermissionMatrix from './PermissionMatrix.svelte';
  import AboutSettings from './AboutSettings.svelte';
  import AuditLogViewer from './AuditLogViewer.svelte';
  let { bundle, page, mfa, preferences, members }: {
    bundle: ProviderBundle;
    page: 'mfa' | 'notifications' | 'members' | 'company' | 'roles' | 'about' | 'audit';
    mfa?: MfaEnrollmentProvider;
    preferences?: NotificationPreferencesProvider;
    members?: MemberDirectoryProvider;
  } = $props();
  provideAdminContext({ get providerBundle() { return bundle; }, resources: [] });
</script>

{#if page === 'mfa'}
  <TwoFactorAuthPage {...mfa ? { enrollmentProvider: mfa } : {}} />
{:else if page === 'notifications'}
  <NotificationsSettings {...preferences ? { preferencesProvider: preferences } : {}} />
{:else if page === 'company'}
  <CompanyProfilePage />
{:else if page === 'roles'}
  <PermissionMatrix roles={[]} resources={[]} actions={[]} isGranted={() => false} onToggle={() => {}} />
{:else if page === 'about'}
  <AboutSettings />
{:else if page === 'audit'}
  <AuditLogViewer />
{:else}
  <MemberDirectory {...members ? { provider: members } : {}} />
{/if}
