<script lang="ts">
  import {
    captureAdminContext,
    notifyWithProvider,
    type EnterpriseSecurityEvent,
    type EnterpriseSecurityPolicy,
    type IdentityProviderSummary,
    type Organization,
  } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import { Label } from '../ui/label/index.js';
  import { Switch } from '../ui/switch/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import SectionHeader from '../content/SectionHeader.svelte';
  import SettingsGroup from '../content/SettingsGroup.svelte';
  import SettingsFieldRow from '../content/SettingsFieldRow.svelte';
  import IntegrationCard from '../content/IntegrationCard.svelte';
  import SecurityEventTable, { type SecurityEvent } from '../content/SecurityEventTable.svelte';
  import DataState from '../content/DataState.svelte';
  import FeedbackNotice from '../content/FeedbackNotice.svelte';

  const i18n = useTranslation();
  const adminContext = captureAdminContext();
  const identityProvider = $derived(adminContext.identityGovernanceProvider);
  const organizationProvider = $derived(adminContext.organizationProvider);
  const isZh = $derived(i18n.locale === 'zh-CN');

  let policy = $state<EnterpriseSecurityPolicy | null>(null);
  let organization = $state<Organization | null>(null);
  let organizationName = $state('');
  let sessionTimeoutValue = $state('');
  let auditRetentionValue = $state('');
  let identityProviders = $state.raw<IdentityProviderSummary[]>([]);
  let events = $state.raw<EnterpriseSecurityEvent[]>([]);
  let metadataUrl = $state('');
  let loading = $state(false);
  let saving = $state(false);
  let savingOrganization = $state(false);
  let testing = $state(false);
  let error = $state<string | null>(null);
  let requestId = 0;
  const organizationChanged = $derived(Boolean(
    organizationProvider?.updateCurrentOrganization
    && organization
    && organizationName.trim()
    && organizationName.trim() !== organization.name,
  ));
  const policyNumbersValid = $derived.by(() => {
    const sessionTimeout = Number(sessionTimeoutValue);
    const auditRetention = Number(auditRetentionValue);
    return /^\d+$/.test(sessionTimeoutValue)
      && /^\d+$/.test(auditRetentionValue)
      && Number.isSafeInteger(sessionTimeout)
      && Number.isSafeInteger(auditRetention)
      && sessionTimeout > 0
      && auditRetention > 0;
  });

  function message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  async function loadSettings(): Promise<void> {
    const currentRequest = ++requestId;
    const scopedIdentityProvider = identityProvider;
    const scopedOrganizationProvider = organizationProvider;
    const context = adminContext.enterpriseRequestContext;
    policy = null;
    organization = null;
    organizationName = '';
    sessionTimeoutValue = '';
    auditRetentionValue = '';
    identityProviders = [];
    events = [];
    error = null;
    loading = false;
    saving = false;
    savingOrganization = false;
    testing = false;
    if (!scopedIdentityProvider && !scopedOrganizationProvider) return;
    loading = true;
    try {
      const [nextPolicy, nextIdentityProviders, nextEvents, nextOrganization] = await Promise.all([
        scopedIdentityProvider?.getSecurityPolicy(context) ?? null,
        scopedIdentityProvider?.listIdentityProviders(context) ?? [],
        scopedIdentityProvider?.listSecurityEvents?.({ page: 1, pageSize: 20 }, context) ?? { data: [], total: 0 },
        scopedOrganizationProvider?.getCurrentOrganization(context) ?? null,
      ]);
      if (currentRequest !== requestId) return;
      policy = nextPolicy;
      sessionTimeoutValue = nextPolicy ? String(nextPolicy.sessionTimeoutMinutes) : '';
      auditRetentionValue = nextPolicy ? String(nextPolicy.auditRetentionDays) : '';
      identityProviders = nextIdentityProviders;
      events = nextEvents.data;
      organization = nextOrganization;
      organizationName = nextOrganization?.name ?? '';
      metadataUrl = nextIdentityProviders[0]?.metadataUrl ?? '';
    } catch (caught) {
      if (currentRequest === requestId) error = message(caught);
    } finally {
      if (currentRequest === requestId) loading = false;
    }
  }

  $effect(() => {
    void identityProvider;
    void organizationProvider;
    void adminContext.tenantCacheKey?.__svadminTenant;
    void loadSettings();
    return () => { requestId += 1; };
  });

  async function saveSettings(): Promise<void> {
    const provider = identityProvider;
    const currentRequest = requestId;
    const context = adminContext.enterpriseRequestContext;
    if (!provider || !policy || !policyNumbersValid) return;
    saving = true;
    try {
      const updatedPolicy = await provider.updateSecurityPolicy({
        ...policy,
        sessionTimeoutMinutes: Number(sessionTimeoutValue),
        auditRetentionDays: Number(auditRetentionValue),
      }, context);
      if (currentRequest !== requestId) return;
      policy = updatedPolicy;
      sessionTimeoutValue = String(updatedPolicy.sessionTimeoutMinutes);
      auditRetentionValue = String(updatedPolicy.auditRetentionDays);
      notifyWithProvider({ type: 'success', message: isZh ? '企业策略已保存' : 'Enterprise policy saved' }, adminContext.notificationProvider);
    } catch (caught) {
      if (currentRequest !== requestId) return;
      notifyWithProvider({ type: 'error', message: message(caught) }, adminContext.notificationProvider);
    } finally {
      if (currentRequest === requestId) saving = false;
    }
  }

  async function saveOrganization(): Promise<void> {
    const provider = organizationProvider;
    const currentRequest = requestId;
    const context = adminContext.enterpriseRequestContext;
    const name = organizationName.trim();
    if (!provider?.updateCurrentOrganization || !organization || !name || name === organization.name) return;
    savingOrganization = true;
    try {
      const updatedOrganization = await provider.updateCurrentOrganization({ name }, context);
      if (currentRequest !== requestId) return;
      organization = updatedOrganization;
      organizationName = updatedOrganization.name;
      notifyWithProvider({ type: 'success', message: isZh ? '组织信息已保存' : 'Organization saved' }, adminContext.notificationProvider);
    } catch (caught) {
      if (currentRequest !== requestId) return;
      notifyWithProvider({ type: 'error', message: message(caught) }, adminContext.notificationProvider);
    } finally {
      if (currentRequest === requestId) savingOrganization = false;
    }
  }

  async function testConnection(target?: IdentityProviderSummary): Promise<void> {
    const provider = identityProvider;
    const currentRequest = requestId;
    const context = adminContext.enterpriseRequestContext;
    if (!provider) return;
    testing = true;
    try {
      const selectedProvider = target ?? identityProviders[0];
      const result = await provider.testIdentityProvider({
        id: selectedProvider?.id,
        protocol: selectedProvider?.protocol,
        metadataUrl: target
          ? target.metadataUrl
          : (metadataUrl.trim() || selectedProvider?.metadataUrl),
      }, context);
      if (currentRequest !== requestId) return;
      notifyWithProvider({
        type: result.success ? 'success' : 'error',
        message: result.success
          ? (isZh ? '身份源连接测试通过' : 'Identity provider connection succeeded')
          : (result.error?.message ?? (isZh ? '身份源连接测试失败' : 'Identity provider connection failed')),
      }, adminContext.notificationProvider);
    } catch (caught) {
      if (currentRequest !== requestId) return;
      notifyWithProvider({ type: 'error', message: message(caught) }, adminContext.notificationProvider);
    } finally {
      if (currentRequest === requestId) testing = false;
    }
  }

  const displayEvents = $derived(events.map((event): SecurityEvent => ({
    id: event.id,
    event: event.event,
    actor: event.actor,
    location: event.location,
    createdAt: event.createdAt instanceof Date ? event.createdAt.toLocaleString() : String(event.createdAt),
    severity: event.severity === 'critical' ? 'danger' : (event.severity ?? 'info'),
  })));
</script>

{#snippet auditControl()}
  <Switch checked={policy?.auditLoggingEnabled ?? false} disabled={!policy || saving} aria-label={i18n.t('account.auditLogging')} onCheckedChange={(checked) => { if (policy) policy = { ...policy, auditLoggingEnabled: checked }; }} />
{/snippet}

{#snippet ssoControl()}
  <Switch checked={policy?.requireSso ?? false} disabled={!policy || saving} aria-label={i18n.t('account.enableSso')} onCheckedChange={(checked) => { if (policy) policy = { ...policy, requireSso: checked }; }} />
{/snippet}

<ContentPageShell pageId="account-settings-enterprise" width="wide">
  <ContentPageHeader title={i18n.t('account.settingsEnterprise')} description={i18n.t('account.settingsEnterpriseDescription')} />
  {#if !identityProvider}
    <FeedbackNotice tone="warning" message={isZh ? '未配置 IdentityGovernanceProvider。企业策略、SSO 测试和安全事件保持不可用，不会伪造保存结果。' : 'IdentityGovernanceProvider is not configured. Enterprise policy, SSO tests, and security events remain unavailable instead of simulating persistence.'} />
  {/if}
  {#if loading}
    <DataState state="loading" />
  {:else if error}
    <DataState state="error" title={isZh ? '企业设置加载失败' : 'Enterprise settings failed to load'} description={error} retry={loadSettings} />
  {:else}
    <div class="grid items-start gap-4 lg:grid-cols-2">
      <SettingsGroup title={i18n.t('account.securityPolicy')} description={isZh ? '配置组织级身份、会话与审计策略。' : 'Configure organization-wide identity, session, and audit controls.'} bodyClass="space-y-4">
        {#if organizationProvider}
          <div class="space-y-2"><Label for="organization-name">{isZh ? '组织名称' : 'Organization name'}</Label><div class="flex gap-2"><Input id="organization-name" bind:value={organizationName} disabled={!organizationProvider.updateCurrentOrganization || savingOrganization} /><Button variant="outline" size="sm" disabled={!organizationChanged || savingOrganization} onclick={saveOrganization}>{savingOrganization ? (isZh ? '保存中...' : 'Saving...') : i18n.t('common.save')}</Button></div></div>
        {/if}
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2"><Label for="session-timeout">{i18n.t('account.sessionTimeout')}</Label><Input id="session-timeout" type="number" min="1" step="1" bind:value={sessionTimeoutValue} disabled={!policy || saving} /></div>
          <div class="space-y-2"><Label for="retention">{i18n.t('account.dataRetention')}</Label><Input id="retention" type="number" min="1" step="1" bind:value={auditRetentionValue} disabled={!policy || saving} /></div>
        </div>
        {#if policy && !policyNumbersValid}<FeedbackNotice tone="warning" message={isZh ? '会话超时和审计保留天数必须为正整数。' : 'Session timeout and audit retention must be positive integers.'} />{/if}
        <SettingsFieldRow label={i18n.t('account.auditLogging')} description={isZh ? '由后端持久化组织级审计策略。' : 'Persist the organization audit policy through the backend provider.'} control={auditControl} separated />
        <Button size="sm" disabled={!identityProvider || !policy || !policyNumbersValid || saving} onclick={saveSettings}>{saving ? (isZh ? '保存中...' : 'Saving...') : i18n.t('common.save')}</Button>
      </SettingsGroup>
      <SettingsGroup title={i18n.t('account.singleSignOn')} description={i18n.t('account.ssoDescription')} bodyClass="space-y-4">
        <SettingsFieldRow label={i18n.t('account.enableSso')} description={isZh ? '启用后由已配置身份源执行组织登录策略。' : 'Require the configured identity provider for organization members.'} control={ssoControl} />
        <Input bind:value={metadataUrl} placeholder="https://idp.example.com/.well-known/openid-configuration" aria-label={i18n.t('account.ssoProvider')} disabled={!identityProvider || testing} />
        <Button variant="outline" size="sm" disabled={!identityProvider || testing} onclick={() => testConnection()}>{testing ? (isZh ? '测试中...' : 'Testing...') : i18n.t('common.test')}</Button>
      </SettingsGroup>
    </div>
    <section class="space-y-3">
      <SectionHeader title={i18n.t('account.connections')} />
      {#if identityProviders.length === 0}
        <DataState state="empty" title={isZh ? '尚未配置身份源' : 'No identity provider configured'} description={isZh ? '请在后端 IdentityGovernanceProvider 中创建并验证身份源。' : 'Create and verify an identity provider through the backend IdentityGovernanceProvider.'} />
      {:else}
        {#each identityProviders as connection (connection.id)}
          <IntegrationCard integration={{ id: connection.id, name: connection.name, account: connection.protocol.toUpperCase(), connected: connection.status === 'connected', description: connection.domain ?? connection.metadataUrl }} onconnect={() => testConnection(connection)} />
        {/each}
      {/if}
    </section>
    <section class="space-y-3"><SectionHeader title={i18n.t('account.securityLog')} /><SecurityEventTable events={displayEvents} emptyTitle={i18n.t('common.noData')} emptyDescription={isZh ? '当前 Provider 未返回安全事件。' : 'The provider returned no security events.'} /></section>
  {/if}
</ContentPageShell>
