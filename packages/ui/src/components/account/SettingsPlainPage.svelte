<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import { Label } from '../ui/label/index.js';
  import { Switch } from '../ui/switch/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import SettingsGroup from '../content/SettingsGroup.svelte';
  import SettingsFieldRow from '../content/SettingsFieldRow.svelte';
  const i18n = useTranslation();
  let displayName = $state('Alex Chen');
  let email = $state('alex@example.com');
  let notifications = $state(true);
  let twoFactor = $state(true);
  let saving = $state(false);
  async function save() { saving = true; await new Promise((resolve) => setTimeout(resolve, 400)); saving = false; }
</script>

{#snippet headerActions()}
  <Button size="sm" onclick={save} disabled={saving}>{i18n.t('common.save')}</Button>
{/snippet}

{#snippet notificationControl()}
  <Switch bind:checked={notifications} aria-label={i18n.t('settings.notifications')} />
{/snippet}

{#snippet twoFactorControl()}
  <Switch bind:checked={twoFactor} aria-label={i18n.t('account.twoFactorAuth')} />
{/snippet}

<ContentPageShell pageId="account-settings-plain" width="narrow">
  <ContentPageHeader title={i18n.t('account.settingsPlain')} description={i18n.t('account.settingsPlainDescription')} actions={headerActions} />
  <SettingsGroup title={i18n.t('account.basicSettings')} description={i18n.t('account.settingsPlainDescription')} bodyClass="space-y-5">
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="space-y-2"><Label for="settings-name">{i18n.t('profile.name')}</Label><Input id="settings-name" bind:value={displayName} /></div>
      <div class="space-y-2"><Label for="settings-email">Email</Label><Input id="settings-email" bind:value={email} type="email" /></div>
    </div>
    <div>
      <SettingsFieldRow label={i18n.t('settings.notifications')} description="Receive account and workflow updates." control={notificationControl} />
      <SettingsFieldRow label={i18n.t('account.twoFactorAuth')} description="Require an additional verification code when signing in." control={twoFactorControl} separated />
    </div>
  </SettingsGroup>
</ContentPageShell>
