<script lang="ts" module>
  export interface NotificationPreferences {
    email: { security: boolean; activity: boolean; reports: boolean };
    push: { security: boolean; activity: boolean; reports: boolean };
    sms: { security: boolean };
  }
  export interface NotificationPreferencesProvider {
    /** 宿主提供的存储范围或服务边界说明。 */
    description?: string;
    load: () => Promise<NotificationPreferences>;
    save: (preferences: NotificationPreferences) => Promise<void>;
  }
</script>
<script lang="ts">
  import { captureAdminContext, useNotification } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from './ui/button/index.js';
  import { Switch } from './ui/switch/index.js';
  import SettingsGroup from './content/SettingsGroup.svelte';
  import SettingsFieldRow from './content/SettingsFieldRow.svelte';
  import DataState from './content/DataState.svelte';
  import FeedbackNotice from './content/FeedbackNotice.svelte';
  import ContentPageHeader from './content/ContentPageHeader.svelte';

  let { preferencesProvider, headingLevel = 'h1' }: { preferencesProvider?: NotificationPreferencesProvider; headingLevel?: 'h1' | 'h2' } = $props();
  const controlId = $props.id();
  const i18n = useTranslation();
  const context = captureAdminContext();
  const notification = useNotification();
  let emailAlerts = $state({ security: true, activity: false, reports: true });
  let pushAlerts = $state({ security: true, activity: true, reports: false });
  let smsAlerts = $state({ security: true });
  let loading = $state(false);
  let saving = $state(false);
  let loaded = $state(false);
  let error = $state('');
  let epoch = 0;
  async function load() {
    const provider = preferencesProvider;
    const request = ++epoch;
    error = ''; loaded = false; saving = false;
    loading = Boolean(provider);
    if (!provider) return;
    try {
      const result = await provider.load();
      if (request !== epoch) return;
      emailAlerts = { ...result.email }; pushAlerts = { ...result.push }; smsAlerts = { ...result.sms };
      loaded = true;
    } catch (caught) {
      if (request === epoch) error = caught instanceof Error ? caught.message : String(caught);
    } finally {
      if (request === epoch) loading = false;
    }
  }
  $effect(() => {
    void preferencesProvider; void context.authProvider; void context.tenantCacheKey?.__svadminTenant;
    void load();
    return () => { epoch += 1; };
  });
  async function saveSettings() {
    const provider = preferencesProvider;
    if (!provider || !loaded || saving) return;
    const request = epoch;
    saving = true; error = '';
    try {
      await provider.save({ email: { ...emailAlerts }, push: { ...pushAlerts }, sms: { ...smsAlerts } });
      if (request === epoch) notification.success(i18n.t('common.updateSuccess'), 3000);
    } catch (caught) {
      if (request === epoch) error = caught instanceof Error ? caught.message : String(caught);
    } finally {
      if (request === epoch) saving = false;
    }
  }
</script>

<div class="svadmin-u-b3542e058833">
  <ContentPageHeader title={i18n.t('settings.notifications')} description={i18n.t('settings.notificationsDescription')} {headingLevel}>
    {#snippet actions()}
      <Button disabled={!loaded || loading || saving} onclick={saveSettings}>{i18n.t('common.save')}</Button>
    {/snippet}
  </ContentPageHeader>
  {#if preferencesProvider?.description}
    <p role="note">{preferencesProvider.description}</p>
  {/if}
  {#if !preferencesProvider}
    <FeedbackNotice tone="warning" message={i18n.locale === 'zh-CN' ? '未配置通知偏好存储服务，设置不可保存。' : 'Notification preference storage is not configured. Settings cannot be saved.'} />
  {/if}
  {#if loading}<DataState state="loading" />{/if}
  {#if error}<p role="alert">{error}</p>{#if !loaded}<Button onclick={load}>{i18n.t('common.retry')}</Button>{/if}{/if}
  <fieldset disabled={!loaded || loading || saving} class="svadmin-u-b3542e058833">
  <SettingsGroup title={i18n.t('notifications.emailTitle')} description={i18n.t('notifications.emailDescription')} headingLevel={headingLevel === 'h1' ? 'h2' : 'h3'}>
    <div class="svadmin-u-fa6acbf81d74 svadmin-u-e783642739e3">
      <SettingsFieldRow controlId={`${controlId}-email-security`} label={i18n.t('notifications.securityAlerts')} description={i18n.t('notifications.securityAlertsDesc')}>{#snippet control()}<Switch id={`${controlId}-email-security`} bind:checked={emailAlerts.security} />{/snippet}</SettingsFieldRow>
      <SettingsFieldRow controlId={`${controlId}-email-activity`} label={i18n.t('notifications.activityLogs')} description={i18n.t('notifications.activityLogsDesc')}>{#snippet control()}<Switch id={`${controlId}-email-activity`} bind:checked={emailAlerts.activity} />{/snippet}</SettingsFieldRow>
      <SettingsFieldRow controlId={`${controlId}-email-reports`} label={i18n.t('notifications.systemAlerts')} description={i18n.t('notifications.systemAlertsDesc')}>{#snippet control()}<Switch id={`${controlId}-email-reports`} bind:checked={emailAlerts.reports} />{/snippet}</SettingsFieldRow>
    </div>
  </SettingsGroup>
  <SettingsGroup title={i18n.t('notifications.pushTitle')} description={i18n.t('notifications.pushDescription')} headingLevel={headingLevel === 'h1' ? 'h2' : 'h3'}>
    <div class="svadmin-u-fa6acbf81d74 svadmin-u-e783642739e3">
      <SettingsFieldRow controlId={`${controlId}-push-security`} label={i18n.t('notifications.securityAlerts')} description={i18n.t('notifications.securityPushDesc')}>{#snippet control()}<Switch id={`${controlId}-push-security`} bind:checked={pushAlerts.security} />{/snippet}</SettingsFieldRow>
      <SettingsFieldRow controlId={`${controlId}-push-activity`} label={i18n.t('notifications.activityLogs')} description={i18n.t('notifications.activityPushDesc')}>{#snippet control()}<Switch id={`${controlId}-push-activity`} bind:checked={pushAlerts.activity} />{/snippet}</SettingsFieldRow>
      <SettingsFieldRow controlId={`${controlId}-push-reports`} label={i18n.t('notifications.systemAlerts')} description={i18n.t('notifications.systemPushDesc')}>{#snippet control()}<Switch id={`${controlId}-push-reports`} bind:checked={pushAlerts.reports} />{/snippet}</SettingsFieldRow>
    </div>
  </SettingsGroup>
  <SettingsGroup title={i18n.t('notifications.smsTitle')} description={i18n.t('notifications.smsDescription')} headingLevel={headingLevel === 'h1' ? 'h2' : 'h3'}>
    <SettingsFieldRow controlId={`${controlId}-sms-security`} label={i18n.t('notifications.criticalSecurity')} description={i18n.t('notifications.criticalSecurityDesc')}>{#snippet control()}<Switch id={`${controlId}-sms-security`} bind:checked={smsAlerts.security} />{/snippet}</SettingsFieldRow>
  </SettingsGroup>
  </fieldset>
</div>
