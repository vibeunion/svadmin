<script lang="ts">
  import { useNotification } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  import { AlertTriangle, KeyRound, Monitor, Shield, ShieldAlert, ShieldCheck, Smartphone, Trash2 } from '@lucide/svelte';
  import type { Component } from 'svelte';
  import * as Alert from './ui/alert/index.js';
  import * as Card from './ui/card/index.js';
  import { Button } from './ui/button/index.js';
  import { Label } from './ui/label/index.js';
  import { Switch } from './ui/switch/index.js';
  import PasswordInput from './PasswordInput.svelte';

  const i18n = useTranslation();
  const notification = useNotification();

  interface SessionInfo {
    id: string;
    os: string;
    browser: string;
    ip: string;
    lastActive: string;
    isCurrent: boolean;
    Icon: Component;
  }

  let is2faEnabled = $state(false);
  let sessions = $state<SessionInfo[]>([
    { id: 'current', os: 'macOS', browser: 'Chrome', ip: '192.168.1.102', lastActive: 'Active now', isCurrent: true, Icon: Monitor },
    { id: 'mobile', os: 'iOS', browser: 'Safari', ip: '192.168.1.105', lastActive: '2 hours ago', isCurrent: false, Icon: Smartphone },
    { id: 'desktop', os: 'Windows', browser: 'Edge', ip: '10.0.0.4', lastActive: '2 days ago', isCurrent: false, Icon: Monitor },
  ]);

  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let passwordErrorMessage = $state('');
  let lastChanged = $state('3 months ago');

  function handlePasswordChange(event: SubmitEvent) {
    event.preventDefault();
    passwordErrorMessage = '';

    if (!currentPassword) {
      passwordErrorMessage = i18n.t('profile.currentPassword');
      return;
    }
    if (newPassword.length < 8) {
      passwordErrorMessage = i18n.t('validation.minLength', { min: 8 });
      return;
    }
    if (newPassword !== confirmPassword) {
      passwordErrorMessage = i18n.t('auth.passwordMismatch');
      return;
    }

    notification.success(i18n.t('profile.passwordChanged'), 3000);
    lastChanged = 'Just now';
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
  }

  function revokeSession(id: string) {
    sessions = sessions.filter((session) => session.id !== id);
  }

  function revokeAllOthers() {
    sessions = sessions.filter((session) => session.isCurrent);
  }
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-xl font-semibold text-foreground">{i18n.t('settings.security')}</h2>
    <p class="mt-1 text-sm text-muted-foreground">{i18n.t('settings.securityDescription')}</p>
  </div>

  <Card.Card>
    <Card.CardHeader>
      <Card.CardTitle class="flex items-center gap-2 text-base">
        {#if is2faEnabled}
          <ShieldCheck class="h-5 w-5 text-green-500" />
        {:else}
          <ShieldAlert class="h-5 w-5 text-amber-500" />
        {/if}
        {i18n.t('security.twoFactorAuth')}
      </Card.CardTitle>
      <Card.CardDescription>{i18n.t('security.twoFactorDescription')}</Card.CardDescription>
    </Card.CardHeader>
    <Card.CardContent>
      <div class="flex items-center justify-between gap-4 border-t pt-4">
        <div class="space-y-1">
          <Label for="two-factor" class="text-sm font-medium">{i18n.t('security.enable2fa')}</Label>
          <p class="text-xs text-muted-foreground">
            {is2faEnabled ? i18n.t('security.twoFactorActive') : i18n.t('security.twoFactorInactive')}
          </p>
        </div>
        <Switch id="two-factor" bind:checked={is2faEnabled} />
      </div>
    </Card.CardContent>
  </Card.Card>

  <Card.Card>
    <Card.CardHeader>
      <Card.CardTitle class="flex items-center gap-2 text-base">
        <KeyRound class="h-4 w-4 text-muted-foreground" />
        {i18n.t('profile.changePassword')}
      </Card.CardTitle>
      <Card.CardDescription>{i18n.t('security.passwordLastChanged', { time: lastChanged })}</Card.CardDescription>
    </Card.CardHeader>
    <Card.CardContent>
      <form onsubmit={handlePasswordChange} class="max-w-sm space-y-4">
        {#if passwordErrorMessage}
          <Alert.Root variant="destructive">
            <AlertTriangle class="h-4 w-4" />
            <Alert.Description>{passwordErrorMessage}</Alert.Description>
          </Alert.Root>
        {/if}

        <PasswordInput id="security-current-password" label={i18n.t('profile.currentPassword')} bind:value={currentPassword} autocomplete="current-password" />
        <PasswordInput id="security-new-password" label={i18n.t('profile.newPassword')} bind:value={newPassword} autocomplete="new-password" showStrength />
        <PasswordInput id="security-confirm-password" label={i18n.t('auth.confirmPassword')} bind:value={confirmPassword} autocomplete="new-password" />

        <Button type="submit">{i18n.t('profile.updatePassword')}</Button>
      </form>
    </Card.CardContent>
  </Card.Card>

  <Card.Card>
    <Card.CardHeader class="flex flex-row items-start justify-between gap-4">
      <div class="space-y-1">
        <Card.CardTitle class="flex items-center gap-2 text-base">
          <Shield class="h-4 w-4 text-muted-foreground" />
          {i18n.t('security.activeSessions')}
        </Card.CardTitle>
        <Card.CardDescription>{i18n.t('security.sessionsDescription')}</Card.CardDescription>
      </div>
      {#if sessions.length > 1}
        <Button variant="outline" size="sm" onclick={revokeAllOthers}>{i18n.t('security.revokeOthers')}</Button>
      {/if}
    </Card.CardHeader>
    <Card.CardContent>
      <div class="divide-y">
        {#each sessions as session (session.id)}
          <div class="flex items-center justify-between gap-4 py-3">
            <div class="flex min-w-0 items-center gap-3">
              <div class="rounded-lg bg-muted p-2 text-muted-foreground">
                <session.Icon class="h-5 w-5" />
              </div>
              <div class="min-w-0 space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-medium">{session.os} - {session.browser}</span>
                  {#if session.isCurrent}
                    <span class="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{i18n.t('security.currentSession')}</span>
                  {/if}
                </div>
                <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{session.ip}</span>
                  <span>{session.lastActive}</span>
                </div>
              </div>
            </div>
            {#if !session.isCurrent}
              <Button variant="ghost" size="icon-sm" onclick={() => revokeSession(session.id)} title={i18n.t('security.revokeSession')}>
                <Trash2 class="h-4 w-4" />
              </Button>
            {/if}
          </div>
        {:else}
          <div class="py-6 text-center text-sm text-muted-foreground">{i18n.t('security.noSessions')}</div>
        {/each}
      </div>
    </Card.CardContent>
  </Card.Card>
</div>
