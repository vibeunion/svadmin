<script lang="ts">
  import { MoreHorizontal, UserRound } from '@lucide/svelte';
  import { Avatar } from '../ui/avatar/index.js';
  import { Button } from '../ui/button/index.js';
  import StatusBadge from './StatusBadge.svelte';
  export interface MemberSummary { id: string; name: string; email?: string; role?: string; department?: string; status?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; avatar?: string; }
  interface Props { members?: MemberSummary[]; onaction?: (member: MemberSummary) => void; class?: string; }
  let { members = [], onaction, class: className = '' }: Props = $props();
  const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
</script>
<div class={'divide-y divide-border overflow-hidden rounded-lg border border-border bg-card ' + className}>
  {#each members as member (member.id)}
    <div class="flex items-center gap-3 px-4 py-3"><Avatar src={member.avatar} alt={member.name} fallback={initials(member.name)} size="sm" /><div class="min-w-0 flex-1"><p class="truncate text-sm font-medium text-foreground">{member.name}</p><p class="truncate text-xs text-muted-foreground">{member.email ?? member.department ?? 'Team member'}</p></div>{#if member.role}<span class="hidden text-xs text-muted-foreground sm:inline">{member.role}</span>{/if}{#if member.status}<StatusBadge status={member.status} label={member.status} />{/if}{#if onaction}<Button variant="ghost" size="icon-sm" aria-label={'Actions for ' + member.name} onclick={() => onaction?.(member)}><MoreHorizontal class="size-4" /></Button>{/if}</div>
  {/each}
  {#if members.length === 0}<div class="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground"><UserRound class="size-6" />No members</div>{/if}
</div>
