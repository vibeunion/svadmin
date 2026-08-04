<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Card from '../ui/card/index.js';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import { Label } from '../ui/label/index.js';
  import { Switch } from '../ui/switch/index.js';
  import { Badge } from '../ui/badge/index.js';
  import { Loader2, Shield, Building2, Lock, Globe, Calendar, Link2, Database } from '@lucide/svelte';

  const i18n = useTranslation();

  const trustedDevices = [
    { name: 'MacBook Pro 16"', detail: 'macOS · Shanghai, CN', lastSeen: '2026-08-04 09:12', current: true },
    { name: 'iPhone 17', detail: 'iOS · Shanghai, CN', lastSeen: '2026-08-03 22:41', current: false },
    { name: 'Windows Workstation', detail: 'Windows · Beijing, CN', lastSeen: '2026-07-28 18:05', current: false },
  ];

  const paymentHistory = [
    { date: '2026-08-01', type: 'Enterprise · Monthly', amount: '$299.00' },
    { date: '2026-07-01', type: 'Enterprise · Monthly', amount: '$299.00' },
    { date: '2026-06-01', type: 'Enterprise · Monthly', amount: '$299.00' },
  ];

  const calendarAccounts = [
    { name: 'Work Calendar', account: 'alex@acme.com', active: true },
    { name: 'Personal Calendar', account: 'alex@example.com', active: false },
  ];

  const connections = [
    { name: 'Source Control', account: 'alexchen', linked: true },
    { name: 'ChatOps', account: '@alex.chen', linked: true },
    { name: 'Cloud Drive', account: 'alex@acme.com', linked: false },
  ];

  let ssoEnabled = $state(false);
  let ssoProvider = $state('');
  let domainRestriction = $state('');
  let passwordPolicy = $state('strong');
  let sessionTimeout = $state('30');
  let ipWhitelist = $state('');
  let auditLogging = $state(true);
  let dataRetention = $state('365');
  let saving = $state(false);

  async function handleSave() {
    saving = true;
    await new Promise(r => setTimeout(r, 800));
    saving = false;
  }
</script>

<div class="space-y-6" data-svadmin-content-page="account">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h2 class="text-xl font-semibold text-foreground">{i18n.t('account.settingsEnterprise')}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{i18n.t('account.settingsEnterpriseDescription')}</p>
    </div>
    <Badge variant="secondary"><Building2 class="h-3 w-3 mr-1" />Enterprise</Badge>
  </div>

  <!-- SSO -->
  <Card.Card class="border-border/60">
    <Card.CardHeader>
      <Card.CardTitle class="flex items-center gap-2 text-base">
        <Shield class="h-4 w-4 text-muted-foreground" />
        {i18n.t('account.singleSignOn')}
      </Card.CardTitle>
      <Card.CardDescription>{i18n.t('account.ssoDescription')}</Card.CardDescription>
    </Card.CardHeader>
    <Card.CardContent class="space-y-4">
      <div class="flex items-center justify-between gap-4">
        <div class="space-y-1">
          <Label for="sso-enabled">{i18n.t('account.enableSso')}</Label>
          <p class="text-xs text-muted-foreground">{i18n.t('account.enableSsoDesc')}</p>
        </div>
        <Switch id="sso-enabled" bind:checked={ssoEnabled} />
      </div>
      {#if ssoEnabled}
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="sso-provider">{i18n.t('account.ssoProvider')}</Label>
            <Input id="sso-provider" bind:value={ssoProvider} placeholder="Okta, Azure AD, etc." />
          </div>
          <div class="space-y-2">
            <Label for="domain-restriction">{i18n.t('account.domainRestriction')}</Label>
            <Input id="domain-restriction" bind:value={domainRestriction} placeholder="@company.com" />
          </div>
        </div>
      {/if}
    </Card.CardContent>
  </Card.Card>

  <!-- Security Policy -->
  <Card.Card class="border-border/60">
    <Card.CardHeader>
      <Card.CardTitle class="flex items-center gap-2 text-base">
        <Lock class="h-4 w-4 text-muted-foreground" />
        {i18n.t('account.securityPolicy')}
      </Card.CardTitle>
    </Card.CardHeader>
    <Card.CardContent class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="password-policy">{i18n.t('account.passwordPolicy')}</Label>
          <select id="password-policy" bind:value={passwordPolicy} class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="basic">{i18n.t('account.policyBasic')}</option>
            <option value="strong">{i18n.t('account.policyStrong')}</option>
            <option value="very-strong">{i18n.t('account.policyVeryStrong')}</option>
          </select>
        </div>
        <div class="space-y-2">
          <Label for="session-timeout">{i18n.t('account.sessionTimeout')}</Label>
          <Input id="session-timeout" bind:value={sessionTimeout} type="number" />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="ip-whitelist">{i18n.t('account.ipWhitelist')}</Label>
        <Input id="ip-whitelist" bind:value={ipWhitelist} placeholder="10.0.0.0/8, 192.168.1.0/24" />
        <p class="text-xs text-muted-foreground">{i18n.t('account.ipWhitelistHint')}</p>
      </div>
    </Card.CardContent>
  </Card.Card>

  <!-- Data & Compliance -->
  <Card.Card class="border-border/60">
    <Card.CardHeader>
      <Card.CardTitle class="flex items-center gap-2 text-base">
        <Globe class="h-4 w-4 text-muted-foreground" />
        {i18n.t('account.dataCompliance')}
      </Card.CardTitle>
    </Card.CardHeader>
    <Card.CardContent class="space-y-4">
      <div class="flex items-center justify-between gap-4">
        <div class="space-y-1">
          <Label for="audit-logging">{i18n.t('account.auditLogging')}</Label>
          <p class="text-xs text-muted-foreground">{i18n.t('account.auditLoggingDesc')}</p>
        </div>
        <Switch id="audit-logging" bind:checked={auditLogging} />
      </div>

      <div class="space-y-2">
        <Label for="data-retention">{i18n.t('account.dataRetention')}</Label>
        <Input id="data-retention" bind:value={dataRetention} type="number" />
      </div>

      <div class="flex justify-end">
        <Button onclick={handleSave} disabled={saving}>
          {#if saving}<Loader2 class="h-4 w-4 animate-spin mr-2" />{/if}
          {i18n.t('common.save')}
        </Button>
      </div>
    </Card.CardContent>
  </Card.Card>

  <div class="grid gap-4 lg:grid-cols-2">
    <!-- Trusted Devices -->
    <Card.Card class="border-border/60">
      <Card.CardHeader>
        <Card.CardTitle class="text-base">{i18n.t('account.trustedDevices')}</Card.CardTitle>
      </Card.CardHeader>
      <Card.CardContent class="p-0">
        <div class="divide-y">
          {#each trustedDevices as device (device.name)}
            <div class="flex items-center justify-between gap-3 px-6 py-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-foreground">{device.name}</p>
                <p class="truncate text-xs text-muted-foreground">{device.detail} · {device.lastSeen}</p>
              </div>
              {#if device.current}
                <Badge variant="secondary" class="shrink-0 text-[10px]">{i18n.t('security.currentSession')}</Badge>
              {/if}
            </div>
          {/each}
        </div>
      </Card.CardContent>
    </Card.Card>

    <!-- Current Plan + Payment History -->
    <div class="space-y-4">
      <Card.Card class="border-primary/30 bg-primary/5">
        <Card.CardHeader class="pb-3">
          <div class="flex items-center justify-between">
            <Card.CardTitle class="text-base">{i18n.t('account.currentPlan')}</Card.CardTitle>
            <Badge variant="secondary">Enterprise</Badge>
          </div>
        </Card.CardHeader>
        <Card.CardContent>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl font-bold text-foreground">$299</span>
            <span class="text-sm text-muted-foreground">{i18n.t('account.perMonth')}</span>
          </div>
          <p class="mt-1 text-xs text-muted-foreground">Unlimited seats · SSO · Audit retention 365d</p>
        </Card.CardContent>
      </Card.Card>

      <Card.Card class="border-border/60">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="text-base">{i18n.t('account.paymentHistory')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="p-0">
          <div class="divide-y">
            <div class="grid grid-cols-3 px-6 py-2 text-xs font-medium text-muted-foreground">
              <span>{i18n.t('account.date')}</span>
              <span>{i18n.t('account.type')}</span>
              <span class="text-right">{i18n.t('account.amount')}</span>
            </div>
            {#each paymentHistory as row (row.date)}
              <div class="grid grid-cols-3 px-6 py-2.5 text-sm">
                <span class="text-muted-foreground">{row.date}</span>
                <span class="text-foreground">{row.type}</span>
                <span class="text-right font-medium text-foreground">{row.amount}</span>
              </div>
            {/each}
          </div>
        </Card.CardContent>
      </Card.Card>
    </div>
  </div>

  <div class="grid gap-4 lg:grid-cols-3">
    <!-- Calendar Accounts -->
    <Card.Card class="border-border/60">
      <Card.CardHeader>
        <Card.CardTitle class="flex items-center gap-2 text-base">
          <Calendar class="h-4 w-4 text-muted-foreground" />{i18n.t('account.calendarAccounts')}
        </Card.CardTitle>
      </Card.CardHeader>
      <Card.CardContent class="space-y-3">
        {#each calendarAccounts as cal (cal.account)}
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-foreground">{cal.name}</p>
              <p class="truncate text-xs text-muted-foreground">{cal.account}</p>
            </div>
            <Badge variant={cal.active ? 'secondary' : 'outline'} class="shrink-0 text-[10px]">
              {cal.active ? i18n.t('account.active') : i18n.t('account.inactive')}
            </Badge>
          </div>
        {/each}
      </Card.CardContent>
    </Card.Card>

    <!-- Connections -->
    <Card.Card class="border-border/60">
      <Card.CardHeader>
        <Card.CardTitle class="flex items-center gap-2 text-base">
          <Link2 class="h-4 w-4 text-muted-foreground" />{i18n.t('account.connections')}
        </Card.CardTitle>
      </Card.CardHeader>
      <Card.CardContent class="space-y-3">
        {#each connections as conn (conn.name)}
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-foreground">{conn.name}</p>
              <p class="truncate text-xs text-muted-foreground">{conn.account}</p>
            </div>
            <Badge variant={conn.linked ? 'secondary' : 'outline'} class="shrink-0 text-[10px]">
              {conn.linked ? i18n.t('integrations.statusConnected') : i18n.t('integrations.statusDisconnected')}
            </Badge>
          </div>
        {/each}
      </Card.CardContent>
    </Card.Card>

    <!-- Data import -->
    <Card.Card class="border-border/60">
      <Card.CardHeader>
        <Card.CardTitle class="flex items-center gap-2 text-base">
          <Database class="h-4 w-4 text-muted-foreground" />{i18n.t('account.dataImport')}
        </Card.CardTitle>
        <Card.CardDescription>{i18n.t('account.dataImportDescription')}</Card.CardDescription>
      </Card.CardHeader>
      <Card.CardContent>
        <div class="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-foreground">Google Analytics</p>
            <p class="truncate text-xs text-muted-foreground">analytics.google.com</p>
          </div>
          <Button size="sm" variant="outline">{i18n.t('network.connect')}</Button>
        </div>
      </Card.CardContent>
    </Card.Card>
  </div>
</div>
