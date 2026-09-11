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
  import { referenceDemoData } from '../../reference-data.js';
  const i18n = useTranslation();
  let query = $state('');
  let inviteEmail = $state('');
  let inviteStatus = $state('');
  let members = $state<MemberSummary[]>(referenceDemoData.members.map((member) => ({ ...member, status: member.status === 'active' ? 'success' : member.status === 'invited' ? 'warning' : 'neutral' })));
  const filtered = $derived(query ? members.filter((member) => `${member.name} ${member.email} ${member.department}`.toLowerCase().includes(query.toLowerCase())) : members);
  function sendInvite() { const email = inviteEmail.trim(); if (!email) return; members = [...members, { id: `invite-${Date.now()}`, name: email.replace(/@.*$/, ''), email, role: 'Viewer', department: 'Pending assignment', status: 'warning' }]; inviteStatus = email; inviteEmail = ''; }
</script>

<ContentPageShell pageId="account-team-members" width="wide">
  <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-020ba687fa12 svadmin-u-64cac80d2e9a svadmin-u-3b9871a0bf93"><ContentPageHeader title={i18n.t("account.teamMembers")} description={i18n.t("account.teamMembersDescription")} /><Button size="sm" onclick={() => document.getElementById("invite-email")?.focus()}><UserPlus class="svadmin-u-783b0d9d1e2c" />{i18n.t("account.inviteMember")}</Button></div>
  <FilterToolbar bind:query placeholder={i18n.t('common.search')} />
  <div class="svadmin-u-f3c543ad5fe9 svadmin-u-0c3bc98565dd svadmin-u-2f27a80ed92b"><Card.Card><Card.CardContent class="svadmin-u-6ed543e2fbbb svadmin-u-c07e54fd1439"><div><h2 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('account.invitePeople')}</h2><p class="svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('account.invitePeopleDescription')}</p></div><div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-77a2a20e90d4 svadmin-u-020ba687fa12"><div class="svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c svadmin-u-6f7e013d6499"><Label for="invite-email">Email</Label><Input id="invite-email" bind:value={inviteEmail} type="email" placeholder="name@example.com" /></div><Button class="svadmin-u-c7d50d5fc0c3" size="sm" disabled={!inviteEmail} onclick={sendInvite}><Send class="svadmin-u-783b0d9d1e2c" />{i18n.t('account.sendInvite')}</Button></div>{#if inviteStatus}<p class="svadmin-u-359090c2d529 svadmin-u-76747e5e02ff" role="status">{i18n.t('account.invited')}: {inviteStatus}</p>{/if}</Card.CardContent></Card.Card><Card.Card><Card.CardContent class="svadmin-u-6ed543e2fbbb svadmin-u-c07e54fd1439"><div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4"><Link2 class="svadmin-u-f7b5fa971871 svadmin-u-bfa603190748" /><h2 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('account.inviteWithLink')}</h2></div><p class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('account.inviteLinkHint')}</p><div class="svadmin-u-60fbb7713999 svadmin-u-77a2a20e90d4"><Input readonly value="https://acme.com/invite/xK7fQ2" class="svadmin-u-0e65706bcccd svadmin-u-359090c2d529" /><Button variant="outline" size="sm"><Copy class="svadmin-u-783b0d9d1e2c" />{i18n.t('account.copyLink')}</Button></div></Card.CardContent></Card.Card></div>
  <MemberList members={filtered} />
</ContentPageShell>
