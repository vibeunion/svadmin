<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Copy, Link2, Send, UserPlus } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import { Label } from '../ui/label/index.js';
  import * as Card from '../ui/card/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import FilterToolbar from '../content/FilterToolbar.svelte';
  import MemberList from '../content/MemberList.svelte';
  import type { MemberSummary } from '../content/MemberList.svelte';
  import { referenceDemoData } from '../reference-data.js';
  const i18n = useTranslation();
  let query = $state('');
  let inviteEmail = $state('');
  let inviteStatus = $state('');
  let members = $state<MemberSummary[]>(referenceDemoData.members.map((member) => ({ ...member, status: member.status === 'active' ? 'success' : member.status === 'invited' ? 'warning' : 'neutral' })));
  const filtered = $derived(query ? members.filter((member) => `${member.name} ${member.email} ${member.department}`.toLowerCase().includes(query.toLowerCase())) : members);
  function sendInvite() { const email = inviteEmail.trim(); if (!email) return; members = [...members, { id: `invite-${Date.now()}`, name: email.split('@')[0], email, role: 'Viewer', department: 'Pending assignment', status: 'warning' }]; inviteStatus = email; inviteEmail = ''; }
</script>

<ContentPageShell pageId="account-team-members" width="wide">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><ContentPageHeader title={i18n.t("account.teamMembers")} description={i18n.t("account.teamMembersDescription")} /><Button size="sm" onclick={() => document.getElementById("invite-email")?.focus()}><UserPlus class="size-3.5" />{i18n.t("account.inviteMember")}</Button></div>
  <FilterToolbar bind:query placeholder={i18n.t('common.search')} />
  <div class="grid gap-4 lg:grid-cols-2"><Card.Card><Card.CardContent class="space-y-3 p-5"><div><h2 class="text-sm font-semibold text-foreground">{i18n.t('account.invitePeople')}</h2><p class="mt-1 text-sm text-muted-foreground">{i18n.t('account.invitePeopleDescription')}</p></div><div class="flex flex-col gap-2 sm:flex-row"><div class="min-w-0 flex-1 space-y-2"><Label for="invite-email">Email</Label><Input id="invite-email" bind:value={inviteEmail} type="email" placeholder="name@example.com" /></div><Button class="self-end" size="sm" disabled={!inviteEmail} onclick={sendInvite}><Send class="size-3.5" />{i18n.t('account.sendInvite')}</Button></div>{#if inviteStatus}<p class="text-xs text-success" role="status">{i18n.t('account.invited')}: {inviteStatus}</p>{/if}</Card.CardContent></Card.Card><Card.Card><Card.CardContent class="space-y-3 p-5"><div class="flex items-center gap-2"><Link2 class="size-4 text-muted-foreground" /><h2 class="text-sm font-semibold text-foreground">{i18n.t('account.inviteWithLink')}</h2></div><p class="text-sm text-muted-foreground">{i18n.t('account.inviteLinkHint')}</p><div class="flex gap-2"><Input readonly value="https://acme.com/invite/xK7fQ2" class="font-mono text-xs" /><Button variant="outline" size="sm"><Copy class="size-3.5" />{i18n.t('account.copyLink')}</Button></div></Card.CardContent></Card.Card></div>
  <MemberList members={filtered} />
</ContentPageShell>
