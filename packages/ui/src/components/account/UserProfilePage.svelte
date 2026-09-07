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
  import WorkspaceLayout from '../content/WorkspaceLayout.svelte';
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
  <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-020ba687fa12 svadmin-u-64cac80d2e9a svadmin-u-3b9871a0bf93"><ContentPageHeader title={i18n.t('account.userProfile')} description={i18n.t('account.userProfileDescription')} /><Button onclick={save} disabled={saving} size="sm">{#if saving}<Loader2 class="svadmin-u-783b0d9d1e2c svadmin-u-afbdd13a380e" />{/if}{i18n.t('common.save')}</Button></div>
  <WorkspaceLayout secondaryWidth="20rem">
    {#snippet primary()}<div class="svadmin-u-3e7ce58d64fa"><Card.Card><Card.CardContent class="svadmin-u-b43b4c086d9a svadmin-u-c07e54fd1439"><div><h2 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('account.personalInfo')}</h2><p class="svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">Keep your contact and working details current.</p></div><DescriptionList columns={2} items={[{ label: i18n.t('profile.name'), value: 'Alex Chen' }, { label: i18n.t('account.phone'), value: '+86 138 **** 9527' }, { label: i18n.t('account.dateOfBirth'), value: '1995-04-18' }, { label: i18n.t('account.address'), value: 'Shanghai, CN' }]} /></Card.CardContent></Card.Card><Card.Card><Card.CardContent class="svadmin-u-3e7ce58d64fa svadmin-u-c07e54fd1439"><div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-1004c0c3954c"><div><h2 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('account.work')}</h2><p class="svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('account.availableNow')}</p></div><Switch bind:checked={availableToHire} /></div><div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-58284b4ea568">{#each ['TypeScript', 'Svelte', 'Node.js', 'Design Systems'] as skill (skill)}<span class="svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-d5eab218aa34 svadmin-u-660d2effb880 svadmin-u-359090c2d529 svadmin-u-bfa603190748">{skill}</span>{/each}</div></Card.CardContent></Card.Card><section class="svadmin-u-6ed543e2fbbb"><h2 class="svadmin-u-4ee734926ff6 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('account.connections')}</h2>{#each integrations as integration (integration.id)}<IntegrationCard {integration} onconnect={() => toggle(integration.id)} />{/each}</section></div>{/snippet}
    {#snippet secondary()}<div class="svadmin-u-3e7ce58d64fa"><Card.Card><Card.CardContent class="svadmin-u-6ed543e2fbbb svadmin-u-c07e54fd1439"><h2 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('account.myFiles')}</h2><FileList files={files} /></Card.CardContent></Card.Card><Card.Card><Card.CardContent class="svadmin-u-6ed543e2fbbb svadmin-u-c07e54fd1439"><h2 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('account.calendarAccounts')}</h2><DescriptionList items={[{ label: 'Work Calendar', value: 'alex@nebulalabs.io' }, { label: 'Personal Calendar', value: 'alex@example.com' }]} /></Card.CardContent></Card.Card></div>{/snippet}
  </WorkspaceLayout>
</ContentPageShell>
