<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Card from '../ui/card/index.js';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import { Label } from '../ui/label/index.js';
  import { Search, UserPlus, MoreHorizontal, Link2, Copy, Send } from '@lucide/svelte';

  const i18n = useTranslation();

  interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Editor' | 'Viewer';
    avatar?: string;
    department: string;
    status: 'active' | 'invited' | 'inactive';
    lastActive: string;
  }

  let searchQuery = $state('');
  let inviteEmail = $state('');
  let inviteRole = $state('Viewer');
  let linkCopied = $state(false);
  let inviteStatus = $state('');

  function focusInvite() {
    document.getElementById('invite-email')?.focus();
  }

  function copyInviteLink() {
    navigator.clipboard?.writeText('https://acme.com/invite/xK7fQ2').catch(() => {});
    linkCopied = true;
    setTimeout(() => linkCopied = false, 2000);
  }

  let members = $state<TeamMember[]>([
    { id: '1', name: 'Alex Chen', email: 'alex@acme.com', role: 'Admin', department: 'Engineering', status: 'active', lastActive: 'Just now' },
    { id: '2', name: 'Sarah Kim', email: 'sarah@acme.com', role: 'Editor', department: 'Design', status: 'active', lastActive: '5 min ago' },
    { id: '3', name: 'Mike Johnson', email: 'mike@acme.com', role: 'Viewer', department: 'Marketing', status: 'invited', lastActive: 'Pending' },
    { id: '4', name: 'Lisa Wang', email: 'lisa@acme.com', role: 'Editor', department: 'Engineering', status: 'active', lastActive: '1 hour ago' },
    { id: '5', name: 'Tom Brown', email: 'tom@acme.com', role: 'Viewer', department: 'Sales', status: 'inactive', lastActive: '2 weeks ago' },
    { id: '6', name: 'Emma Davis', email: 'emma@acme.com', role: 'Admin', department: 'Engineering', status: 'active', lastActive: '10 min ago' },
    { id: '7', name: 'James Wilson', email: 'james@acme.com', role: 'Editor', department: 'Infrastructure', status: 'active', lastActive: '30 min ago' },
    { id: '8', name: 'Yuki Tanaka', email: 'yuki@acme.com', role: 'Editor', department: 'Engineering', status: 'invited', lastActive: 'Pending' },
    { id: '9', name: 'Priya Nair', email: 'priya@acme.com', role: 'Viewer', department: 'Data', status: 'active', lastActive: '2 hours ago' },
    { id: '10', name: 'Carlos Mendez', email: 'carlos@acme.com', role: 'Editor', department: 'Engineering', status: 'active', lastActive: '1 day ago' },
    { id: '11', name: 'Hana Sato', email: 'hana@acme.com', role: 'Viewer', department: 'Design', status: 'active', lastActive: '3 hours ago' },
    { id: '12', name: 'Oscar Lund', email: 'oscar@acme.com', role: 'Viewer', department: 'Infrastructure', status: 'inactive', lastActive: '1 month ago' },
    { id: '13', name: 'Mia Torres', email: 'mia@acme.com', role: 'Editor', department: 'Marketing', status: 'invited', lastActive: 'Pending' },
    { id: '14', name: 'Chen Wei', email: 'chen@acme.com', role: 'Admin', department: 'Engineering', status: 'active', lastActive: '15 min ago' },
  ]);

  function sendInvite() {
    const email = inviteEmail.trim();
    if (!email) return;
    const name = email.split('@')[0].split(/[._-]/).filter(Boolean).map(part => part[0]?.toUpperCase() + part.slice(1)).join(' ') || email;
    members = [...members, {
      id: `invite-${Date.now()}`,
      name,
      email,
      role: inviteRole as TeamMember['role'],
      department: 'Pending assignment',
      status: 'invited',
      lastActive: 'Pending',
    }];
    inviteStatus = email;
    inviteEmail = '';
  }

  const filtered = $derived(
    searchQuery
      ? members.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase()) || m.department.toLowerCase().includes(searchQuery.toLowerCase()))
      : members
  );

  const roleColors = {
    'Admin': 'bg-red-500/10 text-red-600',
    'Editor': 'bg-blue-500/10 text-blue-600',
    'Viewer': 'bg-green-500/10 text-green-600',
  };

  const statusColors = {
    'active': 'bg-green-500/10 text-green-600',
    'invited': 'bg-amber-500/10 text-amber-600',
    'inactive': 'bg-muted text-muted-foreground',
  };

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  function statusLabel(status: TeamMember['status']) {
    if (status === 'active') return i18n.t('account.active');
    if (status === 'invited') return i18n.t('account.invited');
    return i18n.t('account.inactive');
  }
</script>

<div class="space-y-6" data-svadmin-content-page="account">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h2 class="text-xl font-semibold text-foreground">{i18n.t('account.teamMembersCount', { count: members.length })}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{i18n.t('account.teamMembersDescription')}</p>
    </div>
    <Button size="sm" onclick={focusInvite}>
      <UserPlus class="h-4 w-4 mr-1" />{i18n.t('account.inviteMember')}
    </Button>
  </div>

  <div class="relative">
    <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input placeholder={i18n.t('common.search')} bind:value={searchQuery} class="pl-9" />
  </div>

  <!-- Invite people -->
  <div class="grid gap-4 lg:grid-cols-2">
    <Card.Card class="border-border/60">
      <Card.CardHeader class="pb-3">
        <Card.CardTitle class="text-base">{i18n.t('account.invitePeople')}</Card.CardTitle>
        <Card.CardDescription>{i18n.t('account.invitePeopleDescription')}</Card.CardDescription>
      </Card.CardHeader>
      <Card.CardContent class="space-y-3">
        <div class="grid gap-3 sm:grid-cols-[1fr_140px]">
          <div class="space-y-1.5">
            <Label for="invite-email">Email</Label>
            <Input id="invite-email" type="email" placeholder="name@example.com" bind:value={inviteEmail} />
          </div>
          <div class="space-y-1.5">
            <Label for="invite-role">{i18n.t('account.role')}</Label>
            <select id="invite-role" bind:value={inviteRole} class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option>Admin</option>
              <option>Editor</option>
              <option>Viewer</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end">
          <Button size="sm" disabled={!inviteEmail} onclick={sendInvite}>
            <Send class="h-3.5 w-3.5 mr-1" />{i18n.t('account.sendInvite')}
          </Button>
        </div>
        {#if inviteStatus}
          <p class="text-xs text-green-600" role="status">{i18n.t('account.invited')}: {inviteStatus}</p>
        {/if}
      </Card.CardContent>
    </Card.Card>

    <Card.Card class="border-border/60">
      <Card.CardHeader class="pb-3">
        <Card.CardTitle class="flex items-center gap-2 text-base">
          <Link2 class="h-4 w-4 text-muted-foreground" />{i18n.t('account.inviteWithLink')}
        </Card.CardTitle>
        <Card.CardDescription>{i18n.t('account.inviteLinkHint')}</Card.CardDescription>
      </Card.CardHeader>
      <Card.CardContent class="space-y-3">
        <div class="flex items-center gap-2">
          <Input readonly value="https://acme.com/invite/xK7fQ2" class="flex-1 font-mono text-xs" />
          <Button size="sm" variant="outline" onclick={copyInviteLink}>
            <Copy class="h-3.5 w-3.5 mr-1" />{linkCopied ? '✓' : ''} {i18n.t('account.copyLink')}
          </Button>
        </div>
      </Card.CardContent>
    </Card.Card>
  </div>

  <!-- Members grid -->
  <div class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
    {#each filtered as member (member.id)}
      <Card.Card class="border-border/60 hover:border-primary/30 transition-colors">
        <Card.CardContent class="p-4">
          <div class="flex items-start gap-3">
            <div class="shrink-0">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {initials(member.name)}
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h4 class="text-sm font-semibold text-foreground truncate">{member.name}</h4>
              </div>
              <p class="text-xs text-muted-foreground truncate">{member.email}</p>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold {roleColors[member.role]}">{member.role}</span>
                <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold {statusColors[member.status]}">{statusLabel(member.status)}</span>
              </div>
              <div class="mt-2 flex items-center justify-between">
                <span class="text-xs text-muted-foreground">{member.department}</span>
                <span class="text-xs text-muted-foreground">{member.lastActive}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label={member.name} title={member.name}><MoreHorizontal class="h-4 w-4" /></Button>
          </div>
        </Card.CardContent>
      </Card.Card>
    {/each}
  </div>
</div>
