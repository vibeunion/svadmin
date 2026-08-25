<script lang="ts">
  import { MoreHorizontal } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Avatar } from '../ui/avatar/index.js';
  import { Button } from '../ui/button/index.js';
  import StatusBadge from './StatusBadge.svelte';
  import DataState from './DataState.svelte';
  import type { DataStateKind } from './DataState.svelte';
  export interface MemberSummary { id: string; name: string; email?: string; role?: string; department?: string; status?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; avatar?: string; }
  interface Props { members?: MemberSummary[]; state?: DataStateKind; stateTitle?: string; stateDescription?: string; emptyTitle?: string; emptyDescription?: string; retry?: () => void; retryLabel?: string; loadingLabel?: string; onaction?: (member: MemberSummary) => void; class?: string; }
  const i18n = useTranslation();
  let { members = [], state, stateTitle, stateDescription, emptyTitle, emptyDescription, retry, retryLabel, loadingLabel, onaction, class: className = '' }: Props = $props();
  const resolvedState = $derived(state ?? (members.length === 0 ? 'empty' : undefined));
  const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
</script>
{#if resolvedState}
  <DataState state={resolvedState} title={stateTitle ?? emptyTitle} description={stateDescription ?? emptyDescription} {retry} {retryLabel} {loadingLabel} class={className} />
{:else}
<div class={'divide-y divide-border overflow-hidden rounded-lg border border-border bg-card ' + className}>
  {#each members as member (member.id)}
    <div class="flex items-center gap-3 px-4 py-3"><Avatar src={member.avatar} alt={member.name} fallback={initials(member.name)} size="sm" /><div class="min-w-0 flex-1"><p class="truncate text-sm font-medium text-foreground">{member.name}</p><p class="truncate text-xs text-muted-foreground">{member.email ?? member.department ?? i18n.t('profileSections.members')}</p></div>{#if member.role}<span class="hidden text-xs text-muted-foreground sm:inline">{member.role}</span>{/if}{#if member.status}<StatusBadge status={member.status} label={member.status} />{/if}{#if onaction}<Button variant="ghost" size="icon-sm" aria-label={i18n.t('common.actions') + ' ' + member.name} onclick={() => onaction?.(member)}><MoreHorizontal class="size-4" /></Button>{/if}</div>
  {/each}
</div>
{/if}
