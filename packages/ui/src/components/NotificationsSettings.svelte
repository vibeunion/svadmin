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

<div class="svadmin-u-b3542e058833">
  <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-8ef2268efbbc svadmin-u-1004c0c3954c svadmin-u-020ba687fa12 svadmin-u-64cac80d2e9a"><div><h2 class="svadmin-u-d5c9b0001e7e svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('settings.notifications')}</h2><p class="svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('settings.notificationsDescription')}</p></div><Button onclick={saveSettings}>{i18n.t('common.save')}</Button></div>
  <SettingsGroup title={i18n.t('notifications.emailTitle')} description={i18n.t('notifications.emailDescription')}>
    <div class="svadmin-u-fa6acbf81d74 svadmin-u-e783642739e3">
      <SettingsFieldRow label={i18n.t('notifications.securityAlerts')} description={i18n.t('notifications.securityAlertsDesc')}>{#snippet control()}<Switch id="email-security" bind:checked={emailAlerts.security} />{/snippet}</SettingsFieldRow>
      <SettingsFieldRow label={i18n.t('notifications.activityLogs')} description={i18n.t('notifications.activityLogsDesc')}>{#snippet control()}<Switch id="email-activity" bind:checked={emailAlerts.activity} />{/snippet}</SettingsFieldRow>
      <SettingsFieldRow label={i18n.t('notifications.systemAlerts')} description={i18n.t('notifications.systemAlertsDesc')}>{#snippet control()}<Switch id="email-reports" bind:checked={emailAlerts.reports} />{/snippet}</SettingsFieldRow>
    </div>
  </SettingsGroup>
  <SettingsGroup title={i18n.t('notifications.pushTitle')} description={i18n.t('notifications.pushDescription')}>
    <div class="svadmin-u-fa6acbf81d74 svadmin-u-e783642739e3">
      <SettingsFieldRow label={i18n.t('notifications.securityAlerts')} description={i18n.t('notifications.securityPushDesc')}>{#snippet control()}<Switch id="push-security" bind:checked={pushAlerts.security} />{/snippet}</SettingsFieldRow>
      <SettingsFieldRow label={i18n.t('notifications.activityLogs')} description={i18n.t('notifications.activityPushDesc')}>{#snippet control()}<Switch id="push-activity" bind:checked={pushAlerts.activity} />{/snippet}</SettingsFieldRow>
      <SettingsFieldRow label={i18n.t('notifications.systemAlerts')} description={i18n.t('notifications.systemPushDesc')}>{#snippet control()}<Switch id="push-reports" bind:checked={pushAlerts.reports} />{/snippet}</SettingsFieldRow>
    </div>
  </SettingsGroup>
  <SettingsGroup title={i18n.t('notifications.smsTitle')} description={i18n.t('notifications.smsDescription')}>
    <SettingsFieldRow label={i18n.t('notifications.criticalSecurity')} description={i18n.t('notifications.criticalSecurityDesc')}>{#snippet control()}<Switch id="sms-security" bind:checked={smsAlerts.security} />{/snippet}</SettingsFieldRow>
  </SettingsGroup>
</div>
