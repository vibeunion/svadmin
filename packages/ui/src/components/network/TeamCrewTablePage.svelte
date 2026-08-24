<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Download, UserPlus } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import FilterToolbar from '../content/FilterToolbar.svelte';
  import NetworkTable from '../content/NetworkTable.svelte';
  import type { NetworkColumn } from '../content/NetworkTable.svelte';
  import { Avatar } from '../ui/avatar/index.js';
  import { Badge } from '../ui/badge/index.js';
  import type { Snippet } from 'svelte';

  interface CrewMember { id: string; name: string; email: string; role: string; department: string; status: 'active' | 'away' | 'offline'; projects: number; }
  const i18n = useTranslation();
  let query = $state('');
  const rows: CrewMember[] = [
    { id: '1', name: 'Alex Chen', email: 'alex@acme.com', role: 'Tech Lead', department: 'Engineering', status: 'active', projects: 12 },
    { id: '2', name: 'Sarah Kim', email: 'sarah@acme.com', role: 'Senior Designer', department: 'Design', status: 'active', projects: 8 },
    { id: '3', name: 'Mike Johnson', email: 'mike@acme.com', role: 'Product Manager', department: 'Product', status: 'away', projects: 6 },
    { id: '4', name: 'Lisa Wang', email: 'lisa@acme.com', role: 'Backend Engineer', department: 'Engineering', status: 'active', projects: 10 },
    { id: '5', name: 'Tom Brown', email: 'tom@acme.com', role: 'QA Engineer', department: 'Engineering', status: 'offline', projects: 4 },
    { id: '6', name: 'Emma Davis', email: 'emma@acme.com', role: 'Engineering Manager', department: 'Engineering', status: 'active', projects: 15 },
  ];
  const filtered = $derived(query ? rows.filter((row) => `${row.name} ${row.email} ${row.department}`.toLowerCase().includes(query.toLowerCase())) : rows);
  const columns: NetworkColumn<CrewMember>[] = [{ key: 'name', label: i18n.t('account.member') }, { key: 'role', label: i18n.t('account.role') }, { key: 'department', label: i18n.t('account.department') }, { key: 'status', label: i18n.t('account.status') }, { key: 'projects', label: i18n.t('publicProfile.projects') }];
  const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
</script>

{#snippet row(item: CrewMember)}
  <tr data-svadmin-table-row><td class="px-4 py-3"><div class="flex items-center gap-3"><Avatar fallback={initials(item.name)} alt={item.name} size="sm" /><div><p class="text-sm font-medium text-foreground">{item.name}</p><p class="text-xs text-muted-foreground">{item.email}</p></div></div></td><td class="px-4 py-3 text-sm">{item.role}</td><td class="px-4 py-3 text-sm text-muted-foreground">{item.department}</td><td class="px-4 py-3"><Badge variant="outline">{item.status}</Badge></td><td class="px-4 py-3 text-sm">{item.projects}</td></tr>
{/snippet}

<ContentPageShell pageId="network-team-crew" width="wide">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><ContentPageHeader title={i18n.t('network.teamCrew')} description={i18n.t('network.teamCrewDescription')} /><div class="flex flex-wrap gap-2"><Button variant="outline" size="sm"><Download class="size-3.5" />{i18n.t('common.export')}</Button><Button size="sm"><UserPlus class="size-3.5" />{i18n.t('account.inviteMember')}</Button></div></div>
  <FilterToolbar bind:query placeholder={i18n.t('common.search')} />
  <NetworkTable rows={filtered} {columns} {row} />
</ContentPageShell>
