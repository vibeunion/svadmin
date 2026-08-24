<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import { Label } from '../ui/label/index.js';
  import { Switch } from '../ui/switch/index.js';
  import * as Card from '../ui/card/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
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

<ContentPageShell pageId="account-settings-enterprise" width="wide">
  <ContentPageHeader title={i18n.t('account.settingsEnterprise')} description={i18n.t('account.settingsEnterpriseDescription')} />
  <div class="grid gap-4 lg:grid-cols-2"><Card.Card><Card.CardContent class="space-y-4 p-5"><div><h2 class="text-sm font-semibold text-foreground">{i18n.t('account.securityPolicy')}</h2><p class="mt-1 text-sm text-muted-foreground">Set organization-wide controls for authentication and sessions.</p></div><div class="space-y-2"><Label for="session-timeout">{i18n.t('account.sessionTimeout')}</Label><Input id="session-timeout" value="30" /></div><div class="space-y-2"><Label for="retention">{i18n.t('account.dataRetention')}</Label><Input id="retention" value="365" /></div><div class="flex items-center justify-between border-t border-border pt-4"><span class="text-sm text-foreground">{i18n.t('account.auditLogging')}</span><Switch bind:checked={auditLogging} /></div><Button size="sm">{i18n.t('common.save')}</Button></Card.CardContent></Card.Card><Card.Card><Card.CardContent class="space-y-4 p-5"><div><h2 class="text-sm font-semibold text-foreground">{i18n.t('account.singleSignOn')}</h2><p class="mt-1 text-sm text-muted-foreground">{i18n.t('account.ssoDescription')}</p></div><div class="flex items-center justify-between border-t border-border pt-4"><span class="text-sm text-foreground">{i18n.t('account.enableSso')}</span><Switch bind:checked={ssoEnabled} /></div><Input value="https://idp.example.com/metadata" aria-label={i18n.t('account.ssoProvider')} /><Button variant="outline" size="sm">{i18n.t('common.test')}</Button></Card.CardContent></Card.Card></div>
  <section class="space-y-3"><h2 class="text-base font-semibold text-foreground">{i18n.t('account.connections')}</h2>{#each identity as integration (integration.id)}<IntegrationCard {integration} />{/each}</section>
  <section class="space-y-3"><h2 class="text-base font-semibold text-foreground">{i18n.t('account.securityLog')}</h2><SecurityEventTable events={events} /></section>
</ContentPageShell>
