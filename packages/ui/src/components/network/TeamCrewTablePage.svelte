<script lang="ts">
  import { captureAdminContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Card from '../ui/card/index.js';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import { Search, Download, UserPlus, MoreHorizontal, CheckCircle2, Clock, XCircle } from '@lucide/svelte';

  const i18n = useTranslation();
  const adminContext = captureAdminContext();

  interface CrewMember {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    status: 'active' | 'away' | 'offline';
    avatar?: string;
    joinedAt: string;
    projects: number;
  }

  let searchQuery = $state('');

  const crew: CrewMember[] = [
    { id: '1', name: 'Alex Chen', email: 'alex@acme.com', role: 'Tech Lead', department: 'Engineering', status: 'active', joinedAt: '2022-03-15', projects: 12 },
    { id: '2', name: 'Sarah Kim', email: 'sarah@acme.com', role: 'Senior Designer', department: 'Design', status: 'active', joinedAt: '2022-06-22', projects: 8 },
    { id: '3', name: 'Mike Johnson', email: 'mike@acme.com', role: 'Product Manager', department: 'Product', status: 'away', joinedAt: '2023-01-10', projects: 6 },
    { id: '4', name: 'Lisa Wang', email: 'lisa@acme.com', role: 'Backend Engineer', department: 'Engineering', status: 'active', joinedAt: '2023-04-05', projects: 10 },
    { id: '5', name: 'Tom Brown', email: 'tom@acme.com', role: 'QA Engineer', department: 'Engineering', status: 'offline', joinedAt: '2022-11-20', projects: 4 },
    { id: '6', name: 'Emma Davis', email: 'emma@acme.com', role: 'Engineering Manager', department: 'Engineering', status: 'active', joinedAt: '2022-02-14', projects: 15 },
    { id: '7', name: 'James Wilson', email: 'james@acme.com', role: 'DevOps Engineer', department: 'Infrastructure', status: 'active', joinedAt: '2023-08-01', projects: 7 },
    { id: '8', name: 'Yuki Tanaka', email: 'yuki@acme.com', role: 'Frontend Engineer', department: 'Engineering', status: 'away', joinedAt: '2023-05-12', projects: 9 },
    { id: '9', name: 'Priya Nair', email: 'priya@acme.com', role: 'Data Scientist', department: 'Data', status: 'active', joinedAt: '2023-09-18', projects: 5 },
    { id: '10', name: 'Carlos Mendez', email: 'carlos@acme.com', role: 'Mobile Engineer', department: 'Engineering', status: 'active', joinedAt: '2022-07-25', projects: 11 },
    { id: '11', name: 'Hana Sato', email: 'hana@acme.com', role: 'UX Researcher', department: 'Design', status: 'away', joinedAt: '2024-01-15', projects: 3 },
    { id: '12', name: 'Oscar Lund', email: 'oscar@acme.com', role: 'Security Engineer', department: 'Infrastructure', status: 'active', joinedAt: '2023-03-30', projects: 6 },
    { id: '13', name: 'Mia Torres', email: 'mia@acme.com', role: 'Content Strategist', department: 'Marketing', status: 'offline', joinedAt: '2024-02-11', projects: 2 },
    { id: '14', name: 'Chen Wei', email: 'chen@acme.com', role: 'Platform Engineer', department: 'Engineering', status: 'active', joinedAt: '2022-10-08', projects: 13 },
    { id: '15', name: 'Ava Novak', email: 'ava@acme.com', role: 'Product Designer', department: 'Design', status: 'active', joinedAt: '2023-06-19', projects: 7 },
    { id: '16', name: 'Liam Ortiz', email: 'liam@acme.com', role: 'QA Automation', department: 'Engineering', status: 'away', joinedAt: '2024-04-02', projects: 4 },
    { id: '17', name: 'Sofia Petrova', email: 'sofia@acme.com', role: 'Data Engineer', department: 'Data', status: 'active', joinedAt: '2023-11-27', projects: 8 },
    { id: '18', name: 'David Kim', email: 'david@acme.com', role: 'Solutions Architect', department: 'Infrastructure', status: 'active', joinedAt: '2022-05-16', projects: 10 },
    { id: '19', name: 'Elena Marsh', email: 'elena@acme.com', role: 'Engineering Manager', department: 'Engineering', status: 'active', joinedAt: '2021-12-06', projects: 14 },
    { id: '20', name: 'Noah Fischer', email: 'noah@acme.com', role: 'Support Lead', department: 'Support', status: 'offline', joinedAt: '2024-05-20', projects: 1 },
  ];

  const totalCrew = 34;

  const filtered = $derived(
    searchQuery
      ? crew.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase()) || m.department.toLowerCase().includes(searchQuery.toLowerCase()))
      : crew
  );

  const statusConfig = {
    'active': { icon: CheckCircle2, color: 'text-green-500', dot: 'bg-green-500', label: i18n.t('account.active') },
    'away': { icon: Clock, color: 'text-amber-500', dot: 'bg-amber-500', label: i18n.t('account.invited') },
    'offline': { icon: XCircle, color: 'text-muted-foreground', dot: 'bg-muted-foreground', label: i18n.t('account.inactive') },
  };

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  function exportCrew() {
    const rows = [
      ['Name', 'Email', 'Role', 'Department', 'Status', 'Projects', 'Joined'],
      ...filtered.map(member => [member.name, member.email, member.role, member.department, member.status, String(member.projects), member.joinedAt]),
    ];
    const csv = rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'team-crew.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="space-y-6" data-svadmin-content-page="network">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h2 class="text-xl font-semibold text-foreground">{i18n.t('network.teamCrew')}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{i18n.t('network.teamCrewDescription')}</p>
    </div>
    <div class="flex gap-2">
      <Button variant="outline" size="sm" onclick={exportCrew}>
        <Download class="h-3.5 w-3.5 mr-1" />{i18n.t('common.export')}
      </Button>
      <Button size="sm" onclick={() => adminContext.navigate('/account/members/team-members')}>
        <UserPlus class="h-3.5 w-3.5 mr-1" />{i18n.t('account.inviteMember')}
      </Button>
    </div>
  </div>

  <div class="relative">
    <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input placeholder={i18n.t('common.search')} bind:value={searchQuery} class="pl-9" />
  </div>

  <!-- Table -->
  <Card.Card class="border-border/60">
    <Card.CardContent class="p-0">
      <div class="hidden overflow-x-auto lg:block">
        <table class="w-full">
          <thead>
            <tr class="border-b bg-muted/30">
              <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{i18n.t('account.member')}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{i18n.t('account.role')}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{i18n.t('account.department')}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{i18n.t('account.status')}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{i18n.t('publicProfile.projects')}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{i18n.t('account.joined')}</th>
              <th class="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody class="divide-y">
            {#each filtered as member (member.id)}
              {@const sc = statusConfig[member.status]}
              <tr class="hover:bg-accent/30 transition-colors">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="relative shrink-0">
                      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {initials(member.name)}
                      </div>
                      <span class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full {sc.dot} ring-2 ring-card"></span>
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-foreground truncate">{member.name}</p>
                      <p class="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-sm text-foreground">{member.role}</td>
                <td class="px-4 py-3 text-sm text-muted-foreground">{member.department}</td>
                <td class="px-4 py-3">
                  <span class="flex items-center gap-1 text-xs {sc.color}">
                    <sc.icon class="h-3 w-3" />{sc.label}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-foreground">{member.projects}</td>
                <td class="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{member.joinedAt}</td>
                <td class="px-4 py-3">
                  <Button variant="ghost" size="icon-sm" aria-label={member.name} title={member.name}><MoreHorizontal class="h-4 w-4" /></Button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="divide-y lg:hidden">
        {#each filtered as member (member.id)}
          {@const sc = statusConfig[member.status]}
          <div class="space-y-3 p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <div class="relative shrink-0">
                  <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {initials(member.name)}
                  </div>
                  <span class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full {sc.dot} ring-2 ring-card"></span>
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-foreground">{member.name}</p>
                  <p class="truncate text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" class="shrink-0" aria-label={member.name} title={member.name}><MoreHorizontal class="h-4 w-4" /></Button>
            </div>
            <div class="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <div class="min-w-0">
                <span class="block font-medium text-foreground">{member.role}</span>
                <span class="truncate">{member.department}</span>
              </div>
              <div class="flex items-center gap-1 {sc.color}">
                <sc.icon class="h-3 w-3" />{sc.label}
              </div>
              <div>{i18n.t('publicProfile.projects')}: <span class="font-medium text-foreground">{member.projects}</span></div>
              <div>{i18n.t('account.joined')}: <span class="font-medium text-foreground">{member.joinedAt}</span></div>
            </div>
          </div>
        {/each}
      </div>
    </Card.CardContent>
  </Card.Card>

  <p class="text-sm text-muted-foreground">{i18n.t('network.showingUsersOf', { shown: filtered.length, total: totalCrew })}</p>
</div>
