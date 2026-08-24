<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import { Label } from '../ui/label/index.js';
  import { Switch } from '../ui/switch/index.js';
  import * as Card from '../ui/card/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  const i18n = useTranslation();
  let displayName = $state('Alex Chen');
  let email = $state('alex@example.com');
  let notifications = $state(true);
  let twoFactor = $state(true);
  let saving = $state(false);
  async function save() { saving = true; await new Promise((resolve) => setTimeout(resolve, 400)); saving = false; }
</script>

<ContentPageShell pageId="account-settings-plain" width="narrow">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><ContentPageHeader title={i18n.t('account.settingsPlain')} description={i18n.t('account.settingsPlainDescription')} /><Button size="sm" onclick={save} disabled={saving}>{i18n.t('common.save')}</Button></div>
  <Card.Card><Card.CardContent class="space-y-5 p-5"><div class="space-y-2"><Label for="settings-name">{i18n.t('profile.name')}</Label><Input id="settings-name" bind:value={displayName} /></div><div class="space-y-2"><Label for="settings-email">Email</Label><Input id="settings-email" bind:value={email} type="email" /></div><div class="flex items-center justify-between gap-4 border-t border-border pt-4"><div><p class="text-sm font-medium text-foreground">{i18n.t('settings.notifications')}</p><p class="mt-1 text-sm text-muted-foreground">Receive account and workflow updates.</p></div><Switch bind:checked={notifications} /></div><div class="flex items-center justify-between gap-4 border-t border-border pt-4"><div><p class="text-sm font-medium text-foreground">{i18n.t('account.twoFactorAuth')}</p><p class="mt-1 text-sm text-muted-foreground">Require an additional verification code when signing in.</p></div><Switch bind:checked={twoFactor} /></div></Card.CardContent></Card.Card>
</ContentPageShell>
