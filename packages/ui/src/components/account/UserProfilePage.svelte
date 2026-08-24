<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Loader2 } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import { Switch } from '../ui/switch/index.js';
  import * as Card from '../ui/card/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import DescriptionList from '../content/DescriptionList.svelte';
  import FileList from '../content/FileList.svelte';
  import IntegrationCard from '../content/IntegrationCard.svelte';
  import type { IntegrationSummary } from '../content/IntegrationCard.svelte';
  import { referenceDemoData } from '../../reference-data.js';
  const i18n = useTranslation();
  let availableToHire = $state(true);
  let saving = $state(false);
  async function save() { saving = true; await new Promise((resolve) => setTimeout(resolve, 400)); saving = false; }
  let integrations = $state<IntegrationSummary[]>(referenceDemoData.integrations);
  const files = [{ id: '1', name: 'portfolio-2026.pdf', size: '2.1 MB', type: 'PDF' }, { id: '2', name: 'avatar-pack.zip', size: '8.4 MB', type: 'Archive' }, { id: '3', name: 'cover-photo.png', size: '1.2 MB', type: 'Image' }];
  function toggle(id: string) { integrations = integrations.map((item) => item.id === id ? { ...item, connected: !item.connected } : item); }
</script>

<ContentPageShell pageId="account-user-profile" width="wide">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><ContentPageHeader title={i18n.t('account.userProfile')} description={i18n.t('account.userProfileDescription')} /><Button onclick={save} disabled={saving} size="sm">{#if saving}<Loader2 class="size-3.5 animate-spin" />{/if}{i18n.t('common.save')}</Button></div>
  <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <div class="space-y-4"><Card.Card><Card.CardContent class="space-y-5 p-5"><div><h2 class="text-sm font-semibold text-foreground">{i18n.t('account.personalInfo')}</h2><p class="mt-1 text-sm text-muted-foreground">Keep your contact and working details current.</p></div><DescriptionList columns={2} items={[{ label: i18n.t('profile.name'), value: 'Alex Chen' }, { label: i18n.t('account.phone'), value: '+86 138 **** 9527' }, { label: i18n.t('account.dateOfBirth'), value: '1995-04-18' }, { label: i18n.t('account.address'), value: 'Shanghai, CN' }]} /></Card.CardContent></Card.Card><Card.Card><Card.CardContent class="space-y-4 p-5"><div class="flex items-center justify-between gap-3"><div><h2 class="text-sm font-semibold text-foreground">{i18n.t('account.work')}</h2><p class="mt-1 text-sm text-muted-foreground">{i18n.t('account.availableNow')}</p></div><Switch bind:checked={availableToHire} /></div><div class="flex flex-wrap gap-1.5">{#each ['TypeScript', 'Svelte', 'Node.js', 'Design Systems'] as skill (skill)}<span class="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">{skill}</span>{/each}</div></Card.CardContent></Card.Card><section class="space-y-3"><h2 class="text-base font-semibold text-foreground">{i18n.t('account.connections')}</h2>{#each integrations as integration (integration.id)}<IntegrationCard {integration} onconnect={() => toggle(integration.id)} />{/each}</section></div>
    <div class="space-y-4"><Card.Card><Card.CardContent class="space-y-3 p-5"><h2 class="text-sm font-semibold text-foreground">{i18n.t('account.myFiles')}</h2><FileList files={files} /></Card.CardContent></Card.Card><Card.Card><Card.CardContent class="space-y-3 p-5"><h2 class="text-sm font-semibold text-foreground">{i18n.t('account.calendarAccounts')}</h2><DescriptionList items={[{ label: 'Work Calendar', value: 'alex@nebulalabs.io' }, { label: 'Personal Calendar', value: 'alex@example.com' }]} /></Card.CardContent></Card.Card></div>
  </div>
</ContentPageShell>
