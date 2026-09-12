<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

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
  <DataState state={resolvedState} {...definedOptions({ title: stateTitle ?? emptyTitle, description: stateDescription ?? emptyDescription, retry, retryLabel, loadingLabel })} class={className} />
{:else}
<div class={'svadmin-u-fa6acbf81d74 svadmin-u-e783642739e3 svadmin-u-2cd02d11d1af svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 ' + className}>
  {#each members as member (member.id)}
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c svadmin-u-f0faeb26d656 svadmin-u-1b2d54a3fd12"><Avatar src={member.avatar} alt={member.name} fallback={initials(member.name)} size="sm" /><div class="svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c"><p class="svadmin-u-f283ea9bea0e svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{member.name}</p><p class="svadmin-u-f283ea9bea0e svadmin-u-359090c2d529 svadmin-u-bfa603190748">{member.email ?? member.department ?? i18n.t('profileSections.members')}</p></div>{#if member.role}<span class="svadmin-u-99d72c7fc3e2 svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-ee3c1259a368">{member.role}</span>{/if}{#if member.status}<StatusBadge status={member.status} label={member.status} />{/if}{#if onaction}<Button variant="ghost" size="icon-sm" aria-label={i18n.t('common.actions') + ' ' + member.name} onclick={() => onaction?.(member)}><MoreHorizontal class="svadmin-u-f7b5fa971871" /></Button>{/if}</div>
  {/each}
</div>
{/if}
