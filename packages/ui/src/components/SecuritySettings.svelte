<script lang="ts">
  import { captureAdminContext, notifyWithProvider, type SessionInfo } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { AlertTriangle, Monitor, Smartphone, Trash2 } from '@lucide/svelte';
  import * as Alert from './ui/alert/index.js';
  import { Button } from './ui/button/index.js';
  import { Switch } from './ui/switch/index.js';
  import PasswordInput from './PasswordInput.svelte';
  import SettingsGroup from './content/SettingsGroup.svelte';
  import SettingsFieldRow from './content/SettingsFieldRow.svelte';
  import DataState from './content/DataState.svelte';
  import FeedbackNotice from './content/FeedbackNotice.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import ContentPageHeader from './content/ContentPageHeader.svelte';

  let { headingLevel = 'h1' }: { headingLevel?: 'h1' | 'h2' } = $props();
  const controlId = $props.id();
  const i18n = useTranslation();
  const adminContext = captureAdminContext();
  const authProvider = $derived(adminContext.authProvider);
  const sessionProvider = $derived(adminContext.sessionProvider);
  const isZh = $derived(i18n.locale === 'zh-CN');

  let is2faEnabled = $state<boolean | null>(null);
  let sessions = $state.raw<SessionInfo[]>([]);
  let loadingSessions = $state(false);
  let sessionError = $state(false);
  let updatingMfa = $state(false);
  let revoking = $state<string | null>(null);
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let passwordErrorMessage = $state('');
  let passwordChangedRecently = $state(false);
  let passwordRequestFailed = $state(false);
  let changingPassword = $state(false);
  let scopeId = 0;
  let securityReadId = 0;
  let pendingDanger = $state<{ label: string; run: () => Promise<void> } | null>(null);
  function requestDanger(label: string, run: () => Promise<void>): void {
    const epoch = scopeId;
    pendingDanger = { label, run: async () => { if (epoch === scopeId) await run(); } };
  }

  function failureMessage(): string {
    return i18n.t('common.operationFailed');
  }

  async function loadSecurity(): Promise<void> {
    const currentRequest = ++securityReadId;
    const provider = sessionProvider;
    const context = adminContext.enterpriseRequestContext;
    sessions = [];
    is2faEnabled = null;
    sessionError = false;
    loadingSessions = false;
    if (!provider) return;
    loadingSessions = true;
    try {
      const [nextSessions, mfa] = await Promise.all([
        provider.listSessions(context),
        provider.getMfaState?.(context) ?? null,
      ]);
      if (currentRequest !== securityReadId) return;
      sessions = nextSessions;
      is2faEnabled = typeof mfa?.enabled === 'boolean' ? mfa.enabled : null;
    } catch {
      if (currentRequest === securityReadId) sessionError = true;
    } finally {
      if (currentRequest === securityReadId) loadingSessions = false;
    }
  }

  $effect(() => {
    void authProvider;
    void sessionProvider;
    void adminContext.tenantCacheKey?.__svadminTenant;
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
    passwordErrorMessage = '';
    passwordChangedRecently = false;
    passwordRequestFailed = false;
    changingPassword = false;
    updatingMfa = false;
    revoking = null;
    pendingDanger = null;
    void loadSecurity();
    return () => {
      scopeId += 1;
      securityReadId += 1;
    };
  });

  async function handleMfaChange(enabled: boolean, confirmed = false): Promise<void> {
    if (is2faEnabled === null || loadingSessions || sessionError || updatingMfa) return;
    if (!enabled && !confirmed) {
      requestDanger(isZh ? '关闭两步验证' : 'Disable two-factor authentication', () => handleMfaChange(false, true));
      return;
    }
    const provider = sessionProvider;
    const currentRequest = scopeId;
    const context = adminContext.enterpriseRequestContext;
    if (!provider?.setMfaEnabled) return;
    updatingMfa = true;
    try {
      const result = await provider.setMfaEnabled(enabled, context);
      if (currentRequest !== scopeId) return;
      is2faEnabled = result.enabled;
    } catch {
      if (currentRequest !== scopeId) return;
      notifyWithProvider({ type: 'error', message: failureMessage() }, adminContext.notificationProvider);
    } finally {
      if (currentRequest === scopeId) updatingMfa = false;
    }
  }

  async function handlePasswordChange(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (changingPassword) return;
    passwordErrorMessage = '';
    passwordRequestFailed = false;
    const provider = authProvider;
    const currentRequest = scopeId;
    if (!provider?.updatePassword) return;
    if (!currentPassword) passwordErrorMessage = i18n.t('profile.currentPassword');
    else if (newPassword.length < 8) passwordErrorMessage = i18n.t('validation.minLength', { min: 8 });
    else if (newPassword !== confirmPassword) passwordErrorMessage = i18n.t('auth.passwordMismatch');
    if (passwordErrorMessage) return;

    changingPassword = true;
    try {
      const result = await provider.updatePassword({ currentPassword, password: newPassword, confirmPassword });
      if (!result.success) throw new Error('Password update failed');
      if (currentRequest !== scopeId) return;
      notifyWithProvider({ type: 'success', message: i18n.t('profile.passwordChanged') }, adminContext.notificationProvider);
      passwordChangedRecently = true;
      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
    } catch {
      if (currentRequest !== scopeId) return;
      passwordRequestFailed = true;
    } finally {
      if (currentRequest === scopeId) changingPassword = false;
    }
  }

  async function revokeSession(id: string, confirmed = false): Promise<void> {
    if (revoking !== null) return;
    if (!confirmed) {
      requestDanger(`${i18n.t('security.revokeSession')}: ${id}`, () => revokeSession(id, true));
      return;
    }
    const provider = sessionProvider;
    const currentRequest = scopeId;
    const context = adminContext.enterpriseRequestContext;
    if (!provider) return;
    revoking = id;
    try {
      const result = await provider.revokeSession(id, context);
      if (!result.success) throw new Error('Session revocation failed');
      if (currentRequest !== scopeId) return;
      sessions = sessions.filter((session) => session.id !== id);
    } catch {
      if (currentRequest !== scopeId) return;
      notifyWithProvider({ type: 'error', message: failureMessage() }, adminContext.notificationProvider);
    } finally {
      if (currentRequest === scopeId) revoking = null;
    }
  }

  async function revokeAllOthers(confirmed = false): Promise<void> {
    if (revoking !== null) return;
    if (!confirmed) {
      requestDanger(i18n.t('security.revokeOthers'), () => revokeAllOthers(true));
      return;
    }
    const provider = sessionProvider;
    const currentRequest = scopeId;
    const context = adminContext.enterpriseRequestContext;
    if (!provider) return;
    revoking = '*';
    try {
      const result = await provider.revokeOtherSessions(context);
      if (!result.success) throw new Error('Session revocation failed');
      if (currentRequest !== scopeId) return;
      sessions = sessions.filter((session) => session.current);
    } catch {
      if (currentRequest !== scopeId) return;
      notifyWithProvider({ type: 'error', message: failureMessage() }, adminContext.notificationProvider);
    } finally {
      if (currentRequest === scopeId) revoking = null;
    }
  }
</script>

<div class="space-y-6">
  <ContentPageHeader title={i18n.t('settings.security')} description={i18n.t('settings.securityDescription')} {headingLevel} />
  {#if !sessionProvider}
    <FeedbackNotice tone="warning" message={isZh ? '未配置 SessionProvider。会话和 MFA 设置不会使用模拟数据。' : 'SessionProvider is not configured. Session and MFA controls do not use simulated data.'} />
  {/if}
  <SettingsGroup title={i18n.t('security.twoFactorAuth')} description={i18n.t('security.twoFactorDescription')} headingLevel={headingLevel === 'h1' ? 'h2' : 'h3'}>
    <SettingsFieldRow controlId={`${controlId}-mfa`} label={i18n.t('security.enable2fa')} description={is2faEnabled === null ? i18n.t('security.twoFactorUnknown') : (is2faEnabled ? i18n.t('security.twoFactorActive') : i18n.t('security.twoFactorInactive'))}>
      {#snippet control()}<Switch id={`${controlId}-mfa`} bind:checked={() => is2faEnabled === true, (enabled) => { void handleMfaChange(enabled); }} disabled={!sessionProvider?.setMfaEnabled || is2faEnabled === null || updatingMfa} />{/snippet}
    </SettingsFieldRow>
  </SettingsGroup>
  <SettingsGroup title={i18n.t('profile.changePassword')} description={isZh ? '密码修改由 AuthProvider 持久化。' : 'Password changes are persisted by AuthProvider.'} headingLevel={headingLevel === 'h1' ? 'h2' : 'h3'}>
    {#if !authProvider?.updatePassword}<FeedbackNotice tone="warning" message={isZh ? '当前 AuthProvider 不支持修改密码。' : 'The current AuthProvider does not support password updates.'} />{/if}
    <form onsubmit={handlePasswordChange} class="max-w-lg space-y-4">
      {#if passwordRequestFailed || passwordErrorMessage}<Alert.Root variant="destructive"><AlertTriangle class="h-4 w-4" /><Alert.Description>{passwordRequestFailed ? failureMessage() : passwordErrorMessage}</Alert.Description></Alert.Root>{/if}
      <PasswordInput id={`${controlId}-security-current-password`} label={i18n.t('profile.currentPassword')} bind:value={currentPassword} autocomplete="current-password" disabled={!authProvider?.updatePassword || changingPassword} />
      <PasswordInput id={`${controlId}-security-new-password`} label={i18n.t('profile.newPassword')} bind:value={newPassword} autocomplete="new-password" showStrength disabled={!authProvider?.updatePassword || changingPassword} />
      <PasswordInput id={`${controlId}-security-confirm-password`} label={i18n.t('auth.confirmPassword')} bind:value={confirmPassword} autocomplete="new-password" disabled={!authProvider?.updatePassword || changingPassword} />
      {#if passwordChangedRecently}<p class="text-xs text-muted-foreground">{i18n.t('profile.passwordChangedRecently')}</p>{/if}
      <Button type="submit" disabled={!authProvider?.updatePassword || changingPassword}>{changingPassword ? (isZh ? '更新中...' : 'Updating...') : i18n.t('profile.updatePassword')}</Button>
    </form>
  </SettingsGroup>
  <SettingsGroup title={i18n.t('security.activeSessions')} description={i18n.t('security.sessionsDescription')} headingLevel={headingLevel === 'h1' ? 'h2' : 'h3'}>
    {#snippet actions()}{#if sessions.some((session) => !session.current)}<Button variant="outline" size="sm" disabled={revoking !== null} onclick={() => revokeAllOthers()}>{i18n.t('security.revokeOthers')}</Button>{/if}{/snippet}
    {#if loadingSessions}
      <DataState state="loading" />
    {:else if sessionError}
      <DataState state="error" description={failureMessage()} retry={loadSecurity} />
    {:else if sessions.length === 0}
      <DataState state="empty" title={i18n.t('security.noSessions')} description={sessionProvider ? (isZh ? 'Provider 未返回活跃会话。' : 'The provider returned no active sessions.') : (isZh ? '配置 SessionProvider 后可管理真实会话。' : 'Configure SessionProvider to manage real sessions.')} />
    {:else}
      <div class="divide-y">
        {#each sessions as session (session.id)}
          <div class="flex items-center justify-between gap-4 py-3">
            <div class="flex min-w-0 items-center gap-3"><div class="rounded-lg bg-muted p-2 text-muted-foreground">{#if (session.os ?? '').toLowerCase().includes('ios') || (session.os ?? '').toLowerCase().includes('android')}<Smartphone class="h-5 w-5" />{:else}<Monitor class="h-5 w-5" />{/if}</div><div class="min-w-0 space-y-1"><div class="flex flex-wrap items-center gap-2"><span class="text-sm font-medium">{session.os ?? (isZh ? '未知系统' : 'Unknown OS')} - {session.browser ?? (isZh ? '未知浏览器' : 'Unknown browser')}</span>{#if session.current}<span class="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{i18n.t('security.currentSession')}</span>{/if}</div><div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{session.ipAddress ?? '-'}</span><span>{session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString() : '-'}</span></div></div></div>
            {#if !session.current}<Button variant="ghost" size="icon-sm" disabled={revoking !== null} onclick={() => revokeSession(session.id)} title={i18n.t('security.revokeSession')}><Trash2 class="h-4 w-4" /></Button>{/if}
          </div>
        {/each}
      </div>
    {/if}
  </SettingsGroup>
</div>
<ConfirmDialog open={pendingDanger !== null}
  title={pendingDanger?.label ?? ''}
  message={isZh ? '此操作将立即影响登录访问。确认继续？' : 'This immediately affects sign-in access. Continue?'}
  oncancel={() => pendingDanger = null}
  onconfirm={() => { const action = pendingDanger; pendingDanger = null; void action?.run(); }} />
