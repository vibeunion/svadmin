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
  import ContentPageHeader from './content/ContentPageHeader.svelte';
  import { User, Mail, Lock, Loader2, AlertCircle, Camera } from '@lucide/svelte';

  let { headingLevel = 'h1' }: { headingLevel?: 'h1' | 'h2' } = $props();
  const i18n = useTranslation();
  const adminContext = captureAdminContext();
  const controlId = $props.id();

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
  let avatarError = $state('');
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
    avatarError = '';
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

  function failureMessage(): string {
    return i18n.t('common.operationFailed');
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
        profileError = failureMessage();
      }
    } catch {
      if (isActiveScope(epoch, provider, scopedTenantIdentity)) {
        profileError = failureMessage();
      }
    } finally {
      if (isActiveScope(epoch, provider, scopedTenantIdentity)) profileSaving = false;
    }
  }

  async function handleAvatarChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    const provider = authProvider;
    input.value = '';
    if (!file || avatarUploading || !provider?.updateProfile) return;
    const epoch = scopeEpoch;
    const scopedTenantIdentity = tenantIdentity;
    avatarUploading = true;
    avatarError = '';
    try {
      const result = await provider.updateProfile({ avatar: file });
      if (!isActiveScope(epoch, provider, scopedTenantIdentity)) return;
      if (result.success) identity.refetch();
      else avatarError = failureMessage();
    } catch {
      if (isActiveScope(epoch, provider, scopedTenantIdentity)) avatarError = failureMessage();
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
      pwError = failureMessage();
    }
  }

  const initials = $derived(
    identity.data?.name
      ? identity.data.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
      : '?'
  );
</script>

<div class="space-y-6">
  <ContentPageHeader title={i18n.t('profile.title')} {headingLevel} />

  <!-- Profile Info -->
  <Card.Card>
    <Card.CardHeader>
      <Card.CardTitle class="flex items-center gap-2 text-base">
        <User class="h-4 w-4 text-muted-foreground" />
        {i18n.t('profile.title')}
      </Card.CardTitle>
    </Card.CardHeader>
    <Card.CardContent>
      {#if identity.isLoading}
        <div class="flex items-center gap-2 text-muted-foreground">
          <Loader2 class="h-4 w-4 animate-spin" />
          {i18n.t('common.loading')}
        </div>
      {:else if identity.error}
        <Alert.Root variant="destructive">
          <AlertCircle class="h-4 w-4" />
          <Alert.Description class="flex gap-2">
            <span>{failureMessage()}</span>
            <Button size="sm" variant="outline" onclick={() => { void identity.refetch(); }}>{i18n.t('common.retry')}</Button>
          </Alert.Description>
        </Alert.Root>
      {:else if identity.data}
        <div class="flex items-start gap-6">
          <!-- Avatar -->
          <div class="shrink-0 relative group">
            {#if identity.data.avatar}
              <img
                src={identity.data.avatar}
                alt={identity.data.name ?? ''}
                class="h-20 w-20 rounded-lg object-cover ring-2 ring-primary/20"
              />
            {:else}
              <div class="h-20 w-20 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
                {initials}
              </div>
            {/if}
            {#if canUpdateProfile}
              <button
                class="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onclick={() => fileInput?.click()}
                disabled={avatarUploading}
                aria-label={i18n.t('account.uploadAvatar')}
                title={i18n.t('account.uploadAvatar')}
              >
                {#if avatarUploading}
                  <Loader2 class="h-5 w-5 text-white animate-spin" />
                {:else}
                  <Camera class="h-5 w-5 text-white" />
                {/if}
              </button>
              <input
                bind:this={fileInput}
                type="file"
                accept="image/*"
                class="hidden"
                onchange={handleAvatarChange}
              />
            {/if}
          </div>

          <!-- Info -->
          <div class="space-y-3 flex-1 min-w-0">
            {#if avatarError}<p role="alert">{avatarError}</p>{/if}
            {#if editingProfile}
              <div class="space-y-3 max-w-sm">
                <div>
                  <Label for={`${controlId}-edit-name`} class="text-xs text-muted-foreground">{i18n.t('profile.name')}</Label>
                  <Input id={`${controlId}-edit-name`} bind:value={editName} class="mt-1" />
                </div>
                {#if profileError}
                  <p class="text-xs text-destructive">{profileError}</p>
                {/if}
                <div class="flex gap-2">
                  <Button size="sm" onclick={saveProfile} disabled={profileSaving}>
                    {#if profileSaving}<Loader2 class="h-3 w-3 animate-spin mr-1" />{/if}
                    {i18n.t('common.save')}
                  </Button>
                  <Button size="sm" variant="outline" onclick={() => { editingProfile = false; }}>
                    {i18n.t('common.cancel')}
                  </Button>
                </div>
              </div>
            {:else}
              <div>
                <Label class="text-xs text-muted-foreground">{i18n.t('profile.name')}</Label>
                <p class="text-lg font-semibold truncate">{identity.data.name ?? '—'}</p>
              </div>

              {#if identity.data.email || identity.data['username']}
                <div class="flex items-center gap-2 text-sm text-muted-foreground">
                  {#if identity.data.email}
                    <Mail class="h-4 w-4 shrink-0" />
                  {:else}
                    <User class="h-4 w-4 shrink-0" />
                  {/if}
                  <span class="truncate">{identity.data.email || identity.data['username']}</span>
                </div>
              {/if}

              {#if identity.data.id}
                <div class="text-xs text-muted-foreground/60 font-mono">
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
        <p class="text-sm text-muted-foreground">{i18n.t('profile.notAvailable')}</p>
      {/if}
    </Card.CardContent>
  </Card.Card>

  <!-- Change Password -->
  <Card.Card>
    <Card.CardHeader>
      <Card.CardTitle class="flex items-center gap-2 text-base">
        <Lock class="h-4 w-4 text-muted-foreground" />
        {i18n.t('profile.changePassword')}
      </Card.CardTitle>
    </Card.CardHeader>
    <Card.CardContent>
      <form onsubmit={handlePasswordChange} class="space-y-4 max-w-sm">
        {#if pwError}
          <Alert.Root variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <Alert.Description>{pwError}</Alert.Description>
          </Alert.Root>
        {/if}

        <PasswordInput
          id={`${controlId}-current-password`}
          label={i18n.t('profile.currentPassword')}
          bind:value={currentPassword}
          autocomplete="current-password"
        />

        <PasswordInput
          id={`${controlId}-new-password`}
          label={i18n.t('profile.newPassword')}
          bind:value={newPassword}
          autocomplete="new-password"
          showStrength
        />

        <PasswordInput
          id={`${controlId}-confirm-new-password`}
          label={i18n.t('auth.confirmPassword')}
          bind:value={confirmPassword}
          autocomplete="new-password"
        />

        <Button type="submit" disabled={updatePw.isLoading}>
          {#if updatePw.isLoading}
            <Loader2 class="h-4 w-4 animate-spin mr-2" />
          {/if}
          {i18n.t('profile.updatePassword')}
        </Button>
      </form>
    </Card.CardContent>
  </Card.Card>
</div>
