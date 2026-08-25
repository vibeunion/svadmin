<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Loader2 } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import { Label } from '../ui/label/index.js';
  import { Textarea } from '../ui/textarea/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import DescriptionList from '../content/DescriptionList.svelte';
  import MemberList from '../content/MemberList.svelte';
  import SectionHeader from '../content/SectionHeader.svelte';
  import SettingsGroup from '../content/SettingsGroup.svelte';
  import WorkspaceLayout from '../content/WorkspaceLayout.svelte';
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

{#snippet headerActions()}
  <Button onclick={save} disabled={saving} size="sm">{#if saving}<Loader2 class="size-3.5 animate-spin" />{/if}{i18n.t('common.save')}</Button>
{/snippet}

{#snippet primary()}
  <SettingsGroup title={i18n.t('account.basicSettings')} description={i18n.t('account.companyProfileDescription')} bodyClass="space-y-4"><div class="grid gap-4 sm:grid-cols-2"><div class="space-y-2"><Label for="company-name">{i18n.t('profile.companyName')}</Label><Input id="company-name" bind:value={companyName} /></div><div class="space-y-2"><Label for="company-industry">{i18n.t('profile.industry')}</Label><Input id="company-industry" bind:value={industry} /></div><div class="space-y-2 sm:col-span-2"><Label for="company-website">{i18n.t('profile.website')}</Label><Input id="company-website" bind:value={website} type="url" /></div></div><div class="space-y-2"><Label for="company-description">{i18n.t('profile.companyDescription')}</Label><Textarea id="company-description" bind:value={description} rows={4} /></div></SettingsGroup>
{/snippet}

{#snippet secondary()}
  <SettingsGroup title={i18n.t('profile.companyName')} description={industry} bodyClass="space-y-4"><p class="text-lg font-semibold text-foreground">{companyName}</p><DescriptionList columns={1} items={[{ label: i18n.t('profile.website'), value: website, href: website }, { label: i18n.t('profile.employees'), value: '1,250' }, { label: i18n.t('profile.founded'), value: '2015' }]} /></SettingsGroup>
{/snippet}

<ContentPageShell pageId="account-company-profile" width="wide">
  <ContentPageHeader title={i18n.t('account.companyProfile')} description={i18n.t('account.companyProfileDescription')} actions={headerActions} />
  <WorkspaceLayout {primary} {secondary} secondaryWidth="20rem" />
  <section class="space-y-3"><SectionHeader title={i18n.t('profileSections.members')} /><MemberList {members} emptyTitle={i18n.t('common.noData')} emptyDescription={i18n.t('empty.description')} /></section>
</ContentPageShell>
