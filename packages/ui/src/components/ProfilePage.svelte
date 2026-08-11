<script lang="ts">
  import {
    captureAdminContext,
    useGetIdentity,
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
  import { User, Mail, Lock, Loader2, AlertCircle, CheckCircle, Camera } from '@lucide/svelte';

  const i18n = useTranslation();
  const adminContext = captureAdminContext();

  const identity = useGetIdentity();
  const updatePw = useUpdatePassword();

  const authProvider = $derived(adminContext.authProvider);
  const tenantIdentity = $derived(adminContext.tenantCacheKey?.__svadminTenant);
  const canUpdateProfile = $derived(Boolean(authProvider?.updateProfile));

  let editingProfile = $state(false);
  let editName = $state('');
  let profileSaving = $state(false);
  let profileSuccess = $state(false);
  let profileError = $state('');
  let avatarUploading = $state(false);
  let fileInput = $state<HTMLInputElement>();
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let pwError = $state('');
  let pwSuccess = $state(false);
  let scopeEpoch = 0;

  function resetProfileScope(): void {
    editingProfile = false;
    editName = '';
    profileSaving = false;
    profileSuccess = false;
    profileError = '';
    avatarUploading = false;
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
    pwError = '';
    pwSuccess = false;
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
    profileSuccess = false;
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
        profileSuccess = true;
        editingProfile = false;
        identity.refetch();
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
    pwSuccess = false;

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
      pwSuccess = true;
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

<div class="space-y-6">
  <div>
    <h2 class="text-xl font-semibold text-foreground">{i18n.t('profile.title')}</h2>
  </div>

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
      {:else if identity.data}
        {#if profileSuccess}
          <Alert.Root class="border-success/30 bg-success/5 text-success mb-4">
            <CheckCircle class="h-4 w-4" />
            <Alert.Description>{i18n.t('common.updateSuccess')}</Alert.Description>
          </Alert.Root>
        {/if}

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
            {#if editingProfile}
              <div class="space-y-3 max-w-sm">
                <div>
                  <Label for="edit-name" class="text-xs text-muted-foreground">{i18n.t('profile.name')}</Label>
                  <Input id="edit-name" bind:value={editName} class="mt-1" />
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

              {#if identity.data.email || identity.data.username}
                <div class="flex items-center gap-2 text-sm text-muted-foreground">
                  {#if identity.data.email}
                    <Mail class="h-4 w-4 shrink-0" />
                  {:else}
                    <User class="h-4 w-4 shrink-0" />
                  {/if}
                  <span class="truncate">{identity.data.email || identity.data.username}</span>
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

        {#if pwSuccess}
          <Alert.Root class="border-success/30 bg-success/5 text-success">
            <CheckCircle class="h-4 w-4" />
            <Alert.Description>{i18n.t('profile.passwordChanged')}</Alert.Description>
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
            <Loader2 class="h-4 w-4 animate-spin mr-2" />
          {/if}
          {i18n.t('profile.updatePassword')}
        </Button>
      </form>
    </Card.CardContent>
  </Card.Card>
</div>
