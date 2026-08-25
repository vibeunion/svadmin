<script lang="ts">
  import { useNotification } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from './ui/button/index.js';
  import { Switch } from './ui/switch/index.js';
  import SettingsGroup from './content/SettingsGroup.svelte';
  import SettingsFieldRow from './content/SettingsFieldRow.svelte';

  const i18n = useTranslation();
  const notification = useNotification();
  let emailAlerts = $state({ security: true, activity: false, reports: true });
  let pushAlerts = $state({ security: true, activity: true, reports: false });
  let smsAlerts = $state({ security: true });
  function saveSettings() { notification.success(i18n.t('common.autoSaved'), 3000); }
</script>

<div class="space-y-6">
  <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h2 class="text-xl font-semibold text-foreground">{i18n.t('settings.notifications')}</h2><p class="mt-1 text-sm text-muted-foreground">{i18n.t('settings.notificationsDescription')}</p></div><Button onclick={saveSettings}>{i18n.t('common.save')}</Button></div>
  <SettingsGroup title={i18n.t('notifications.emailTitle')} description={i18n.t('notifications.emailDescription')}>
    <div class="divide-y divide-border">
      <SettingsFieldRow label={i18n.t('notifications.securityAlerts')} description={i18n.t('notifications.securityAlertsDesc')}>{#snippet control()}<Switch id="email-security" bind:checked={emailAlerts.security} />{/snippet}</SettingsFieldRow>
      <SettingsFieldRow label={i18n.t('notifications.activityLogs')} description={i18n.t('notifications.activityLogsDesc')}>{#snippet control()}<Switch id="email-activity" bind:checked={emailAlerts.activity} />{/snippet}</SettingsFieldRow>
      <SettingsFieldRow label={i18n.t('notifications.systemAlerts')} description={i18n.t('notifications.systemAlertsDesc')}>{#snippet control()}<Switch id="email-reports" bind:checked={emailAlerts.reports} />{/snippet}</SettingsFieldRow>
    </div>
  </SettingsGroup>
  <SettingsGroup title={i18n.t('notifications.pushTitle')} description={i18n.t('notifications.pushDescription')}>
    <div class="divide-y divide-border">
      <SettingsFieldRow label={i18n.t('notifications.securityAlerts')} description={i18n.t('notifications.securityPushDesc')}>{#snippet control()}<Switch id="push-security" bind:checked={pushAlerts.security} />{/snippet}</SettingsFieldRow>
      <SettingsFieldRow label={i18n.t('notifications.activityLogs')} description={i18n.t('notifications.activityPushDesc')}>{#snippet control()}<Switch id="push-activity" bind:checked={pushAlerts.activity} />{/snippet}</SettingsFieldRow>
      <SettingsFieldRow label={i18n.t('notifications.systemAlerts')} description={i18n.t('notifications.systemPushDesc')}>{#snippet control()}<Switch id="push-reports" bind:checked={pushAlerts.reports} />{/snippet}</SettingsFieldRow>
    </div>
  </SettingsGroup>
  <SettingsGroup title={i18n.t('notifications.smsTitle')} description={i18n.t('notifications.smsDescription')}>
    <SettingsFieldRow label={i18n.t('notifications.criticalSecurity')} description={i18n.t('notifications.criticalSecurityDesc')}>{#snippet control()}<Switch id="sms-security" bind:checked={smsAlerts.security} />{/snippet}</SettingsFieldRow>
  </SettingsGroup>
</div>
