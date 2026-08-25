<script lang="ts">
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
  import type { IntegrationSummary } from '../content/IntegrationCard.svelte';
  import SecurityEventTable from '../content/SecurityEventTable.svelte';
  import type { SecurityEvent } from '../content/SecurityEventTable.svelte';
  const i18n = useTranslation();
  let ssoEnabled = $state(false);
  let auditLogging = $state(true);
  const identity: IntegrationSummary[] = [{ id: 'sso', name: 'Enterprise identity provider', description: i18n.t('account.ssoDescription'), account: 'SAML / OIDC', connected: false }];
  const events: SecurityEvent[] = [{ id: '1', event: 'SSO policy updated', actor: 'Alex Chen', location: 'Shanghai, CN', createdAt: 'Today, 09:12', severity: 'info' }, { id: '2', event: 'Audit log retention changed', actor: 'Alex Chen', location: 'Shanghai, CN', createdAt: 'Yesterday, 16:40', severity: 'warning' }];
</script>

{#snippet auditControl()}
  <Switch bind:checked={auditLogging} aria-label={i18n.t('account.auditLogging')} />
{/snippet}

{#snippet ssoControl()}
  <Switch bind:checked={ssoEnabled} aria-label={i18n.t('account.enableSso')} />
{/snippet}

<ContentPageShell pageId="account-settings-enterprise" width="wide">
  <ContentPageHeader title={i18n.t('account.settingsEnterprise')} description={i18n.t('account.settingsEnterpriseDescription')} />
  <div class="grid gap-4 lg:grid-cols-2">
    <SettingsGroup title={i18n.t('account.securityPolicy')} description="Set organization-wide controls for authentication and sessions." bodyClass="space-y-4">
      <div class="grid gap-4 sm:grid-cols-2"><div class="space-y-2"><Label for="session-timeout">{i18n.t('account.sessionTimeout')}</Label><Input id="session-timeout" value="30" /></div><div class="space-y-2"><Label for="retention">{i18n.t('account.dataRetention')}</Label><Input id="retention" value="365" /></div></div>
      <SettingsFieldRow label={i18n.t('account.auditLogging')} description="Preserve an auditable record of organization-level changes." control={auditControl} separated />
      <Button size="sm">{i18n.t('common.save')}</Button>
    </SettingsGroup>
    <SettingsGroup title={i18n.t('account.singleSignOn')} description={i18n.t('account.ssoDescription')} bodyClass="space-y-4">
      <SettingsFieldRow label={i18n.t('account.enableSso')} description="Require the configured identity provider for organization members." control={ssoControl} />
      <Input value="https://idp.example.com/metadata" aria-label={i18n.t('account.ssoProvider')} />
      <Button variant="outline" size="sm">{i18n.t('common.test')}</Button>
    </SettingsGroup>
  </div>
  <section class="space-y-3"><SectionHeader title={i18n.t('account.connections')} />{#each identity as integration (integration.id)}<IntegrationCard {integration} />{/each}</section>
  <section class="space-y-3"><SectionHeader title={i18n.t('account.securityLog')} /><SecurityEventTable events={events} emptyTitle={i18n.t('common.noData')} emptyDescription={i18n.t('empty.description')} /></section>
</ContentPageShell>
