<script lang="ts">
  import {
    captureAdminContext,
    useGetIdentity,
    useNotification,
    useUpdatePassword,
    type AuthProvider,
  } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from './ui/button/index.js';
  import { Label } from './ui/label/index.js';
  import { Input } from './ui/input/index.js';
  import * as Card from './ui/card/index.js';
  import * as Alert from './ui/alert/index.js';
  import PasswordInput from './PasswordInput.svelte';
  import { User, Mail, Lock, Loader2, AlertCircle, Camera } from '@lucide/svelte';

  const i18n = useTranslation();
  const adminContext = captureAdminContext();

  const identity = useGetIdentity();
  const notification = useNotification();
  const updatePw = useUpdatePassword({ successNotification: i18n.t('profile.passwordChanged') });

  const authProvider = $derived(adminContext.authProvider);
  const tenantIdentity = $derived(adminContext.tenantCacheKey?.__svadminTenant);
  const canUpdateProfile = $derived(Boolean(authProvider?.updateProfile));

  let editingProfile = $state(false);
  let editName = $state('');
  let profileSaving = $state(false);
  let profileError = $state('');
  let avatarUploading = $state(false);
  let fileInput = $state<HTMLInputElement>();
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let pwError = $state('');
  let scopeEpoch = 0;

  function resetProfileScope(): void {
    editingProfile = false;
    editName = '';
    profileSaving = false;
    profileError = '';
    avatarUploading = false;
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
    pwError = '';
  }

  function isActiveScope(
    epoch: number,
    provider: AuthProvider | null,
    scopedTenantIdentity: string | number | undefined,
  ): boolean {
    return epoch === scopeEpoch
      && provider === authProvider
      && scopedTenantIdentity === tenantIdentity;
  }

  $effect(() => {
    void authProvider;
    void tenantIdentity;
    scopeEpoch++;
    resetProfileScope();
    return () => {
      scopeEpoch++;
    };
  });

  function startEditProfile() {
    editName = identity.data?.name ?? '';
    editingProfile = true;
    profileError = '';
  }

  async function saveProfile() {
    const provider = authProvider;
    if (!provider?.updateProfile) return;
    const epoch = scopeEpoch;
    const scopedTenantIdentity = tenantIdentity;
    profileSaving = true;
    profileError = '';
    try {
      const result = await provider.updateProfile({ name: editName });
      if (!isActiveScope(epoch, provider, scopedTenantIdentity)) return;
      if (result.success) {
        editingProfile = false;
        identity.refetch();
        notification.success(i18n.t('common.updateSuccess'), 3000);
      } else {
        profileError = result.error?.message ?? i18n.t('common.operationFailed');
      }
    } catch (e) {
      if (isActiveScope(epoch, provider, scopedTenantIdentity)) {
        profileError = e instanceof Error ? e.message : String(e);
      }
    } finally {
      if (isActiveScope(epoch, provider, scopedTenantIdentity)) profileSaving = false;
    }
  }

  async function handleAvatarChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    const provider = authProvider;
    if (!file || !provider?.updateProfile) return;
    const epoch = scopeEpoch;
    const scopedTenantIdentity = tenantIdentity;
    avatarUploading = true;
    try {
      const result = await provider.updateProfile({ avatar: file });
      if (isActiveScope(epoch, provider, scopedTenantIdentity) && result.success) identity.refetch();
    } finally {
      if (isActiveScope(epoch, provider, scopedTenantIdentity)) avatarUploading = false;
    }
  }

  async function handlePasswordChange(e: SubmitEvent) {
    e.preventDefault();
    pwError = '';

    if (!newPassword) { pwError = i18n.t('auth.passwordRequired'); return; }
    if (newPassword !== confirmPassword) { pwError = i18n.t('auth.passwordMismatch'); return; }

    const provider = authProvider;
    const epoch = scopeEpoch;
    const scopedTenantIdentity = tenantIdentity;
    const result = await updatePw.mutate({
      password: newPassword,
      currentPassword,
      confirmPassword,
    });
    if (!isActiveScope(epoch, provider, scopedTenantIdentity)) return;
    if (result.success) {
      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
    } else {
      pwError = result.error?.message ?? i18n.t('common.operationFailed');
    }
  }

  const initials = $derived(
    identity.data?.name
      ? identity.data.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
      : '?'
  );
</script>

<div class="svadmin-u-b3542e058833">
  <div>
    <h2 class="svadmin-u-d5c9b0001e7e svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('profile.title')}</h2>
  </div>

  <!-- Profile Info -->
  <Card.Card>
    <Card.CardHeader>
      <Card.CardTitle class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-4ee734926ff6">
        <User class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748" />
        {i18n.t('profile.title')}
      </Card.CardTitle>
    </Card.CardHeader>
    <Card.CardContent>
      {#if identity.isLoading}
        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-bfa603190748">
          <Loader2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-afbdd13a380e" />
          {i18n.t('common.loading')}
        </div>
      {:else if identity.data}
        <div class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-0d304f904cb0">
          <!-- Avatar -->
          <div class="svadmin-u-012fbd121f37 svadmin-u-d89972fe17d6 group">
            {#if identity.data.avatar}
              <img
                src={identity.data.avatar}
                alt={identity.data.name ?? ''}
                class="svadmin-u-0a769880db93 svadmin-u-ed831a4dff32 svadmin-u-5f22e64f2282 svadmin-u-7d85d0c21a32 svadmin-u-16b1efa5875e svadmin-u-2b6f77ad4036"
              />
            {:else}
              <div class="svadmin-u-0a769880db93 svadmin-u-ed831a4dff32 svadmin-u-5f22e64f2282 svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-3febee094e85 svadmin-u-69450ef1487e">
                {initials}
              </div>
            {/if}
            {#if canUpdateProfile}
              <button
                class="svadmin-u-da4dbfbc4fdc svadmin-u-7b7df0449b80 svadmin-u-5f22e64f2282 svadmin-u-53bb3a280599 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-7065497e1ca0 svadmin-u-181f3d6c9821 svadmin-u-67d6184a0024 svadmin-u-34516836730d"
                onclick={() => fileInput?.click()}
                disabled={avatarUploading}
              >
                {#if avatarUploading}
                  <Loader2 class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-72a4c7cdeef7 svadmin-u-afbdd13a380e" />
                {:else}
                  <Camera class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-72a4c7cdeef7" />
                {/if}
              </button>
              <input
                bind:this={fileInput}
                type="file"
                accept="image/*"
                class="svadmin-u-99d72c7fc3e2"
                onchange={handleAvatarChange}
              />
            {/if}
          </div>

          <!-- Info -->
          <div class="svadmin-u-6ed543e2fbbb svadmin-u-36e579c0b41c svadmin-u-7e0b7cdf1a94">
            {#if editingProfile}
              <div class="svadmin-u-6ed543e2fbbb svadmin-u-2472e9b81a97">
                <div>
                  <Label for="edit-name" class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{i18n.t('profile.name')}</Label>
                  <Input id="edit-name" bind:value={editName} class="svadmin-u-b6b02c0ebef6" />
                </div>
                {#if profileError}
                  <p class="svadmin-u-359090c2d529 svadmin-u-811148b13d1e">{profileError}</p>
                {/if}
                <div class="svadmin-u-60fbb7713999 svadmin-u-77a2a20e90d4">
                  <Button size="sm" onclick={saveProfile} disabled={profileSaving}>
                    {#if profileSaving}<Loader2 class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-afbdd13a380e svadmin-u-618162408e7a" />{/if}
                    {i18n.t('common.save')}
                  </Button>
                  <Button size="sm" variant="outline" onclick={() => { editingProfile = false; }}>
                    {i18n.t('common.cancel')}
                  </Button>
                </div>
              </div>
            {:else}
              <div>
                <Label class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{i18n.t('profile.name')}</Label>
                <p class="svadmin-u-42536e69e639 svadmin-u-e83a7042bc91 svadmin-u-f283ea9bea0e">{identity.data.name ?? '—'}</p>
              </div>

              {#if identity.data.email || identity.data['username']}                <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">
                  {#if identity.data.email}
                    <Mail class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-012fbd121f37" />
                  {:else}
                    <User class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-012fbd121f37" />
                  {/if}
                  <span class="svadmin-u-f283ea9bea0e">{identity.data.email || identity.data['username']}</span>                </div>
              {/if}

              {#if identity.data.id}
                <div class="svadmin-u-359090c2d529 svadmin-u-7be4d67a6256 svadmin-u-0e65706bcccd">
                  ID: {identity.data.id}
                </div>
              {/if}

              {#if canUpdateProfile}
                <Button size="sm" variant="outline" onclick={startEditProfile}>
                  {i18n.t('common.edit')}
                </Button>
              {/if}
            {/if}
          </div>
        </div>
      {:else}
        <p class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('profile.notAvailable')}</p>
      {/if}
    </Card.CardContent>
  </Card.Card>

  <!-- Change Password -->
  <Card.Card>
    <Card.CardHeader>
      <Card.CardTitle class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-4ee734926ff6">
        <Lock class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748" />
        {i18n.t('profile.changePassword')}
      </Card.CardTitle>
    </Card.CardHeader>
    <Card.CardContent>
      <form onsubmit={handlePasswordChange} class="svadmin-u-3e7ce58d64fa svadmin-u-2472e9b81a97">
        {#if pwError}
          <Alert.Root variant="destructive">
            <AlertCircle class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
            <Alert.Description>{pwError}</Alert.Description>
          </Alert.Root>
        {/if}

        <PasswordInput
          id="current-password"
          label={i18n.t('profile.currentPassword')}
          bind:value={currentPassword}
          autocomplete="current-password"
        />

        <PasswordInput
          id="new-password"
          label={i18n.t('auth.password')}
          bind:value={newPassword}
          autocomplete="new-password"
          showStrength
        />

        <PasswordInput
          id="confirm-new-password"
          label={i18n.t('auth.confirmPassword')}
          bind:value={confirmPassword}
          autocomplete="new-password"
        />

        <Button type="submit" disabled={updatePw.isLoading}>
          {#if updatePw.isLoading}
            <Loader2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-afbdd13a380e svadmin-u-d2347e8497a9" />
          {/if}
          {i18n.t('profile.updatePassword')}
        </Button>
      </form>
    </Card.CardContent>
  </Card.Card>
</div>
