<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Loader2 } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import { Label } from '../ui/label/index.js';
  import * as Card from '../ui/card/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import DescriptionList from '../content/DescriptionList.svelte';
  import MemberList from '../content/MemberList.svelte';
  import type { MemberSummary } from '../content/MemberList.svelte';
  const i18n = useTranslation();
  let companyName = $state('Acme Corporation');
  let industry = $state('Technology');
  let website = $state('https://acme.com');
  let description = $state('Building the future of enterprise software with dependable AI and cloud workflows.');
  let saving = $state(false);
  const members: MemberSummary[] = [
    { id: '1', name: 'Alex Chen', email: 'alex@acme.com', role: 'Admin', status: 'success' },
    { id: '2', name: 'Sarah Kim', email: 'sarah@acme.com', role: 'Editor', status: 'success' },
    { id: '3', name: 'Mike Johnson', email: 'mike@acme.com', role: 'Viewer', status: 'neutral' },
    { id: '4', name: 'Emma Davis', email: 'emma@acme.com', role: 'Admin', status: 'success' },
  ];
  async function save() { saving = true; await new Promise((resolve) => setTimeout(resolve, 400)); saving = false; }
</script>

<ContentPageShell pageId="account-company-profile" width="wide">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><ContentPageHeader title={i18n.t("account.companyProfile")} description={i18n.t("account.companyProfileDescription")} /><Button onclick={save} disabled={saving} size="sm">{#if saving}<Loader2 class="size-3.5 animate-spin" />{/if}{i18n.t("common.save")}</Button></div>
  <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <Card.Card><Card.CardContent class="space-y-4 p-5"><div class="grid gap-4 sm:grid-cols-2"><div class="space-y-2"><Label for="company-name">{i18n.t('profile.companyName')}</Label><Input id="company-name" bind:value={companyName} /></div><div class="space-y-2"><Label for="company-industry">{i18n.t('profile.industry')}</Label><Input id="company-industry" bind:value={industry} /></div><div class="space-y-2 sm:col-span-2"><Label for="company-website">{i18n.t('profile.website')}</Label><Input id="company-website" bind:value={website} type="url" /></div></div><div class="space-y-2"><Label for="company-description">{i18n.t('profile.companyDescription')}</Label><textarea id="company-description" bind:value={description} rows={4} class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"></textarea></div></Card.CardContent></Card.Card>
    <Card.Card><Card.CardContent class="space-y-4 p-5"><div><p class="text-xs font-medium text-muted-foreground">{i18n.t('profile.companyName')}</p><p class="mt-1 text-lg font-semibold text-foreground">{companyName}</p><p class="text-sm text-muted-foreground">{industry}</p></div><DescriptionList columns={1} items={[{ label: i18n.t('profile.website'), value: website, href: website }, { label: i18n.t('profile.employees'), value: '1,250' }, { label: i18n.t('profile.founded'), value: '2015' }]} /></Card.CardContent></Card.Card>
  </div>
  <section class="space-y-3"><h2 class="text-base font-semibold text-foreground">{i18n.t('profileSections.members')}</h2><MemberList {members} /></section>
</ContentPageShell>
