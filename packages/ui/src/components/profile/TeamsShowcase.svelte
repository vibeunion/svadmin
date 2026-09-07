<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { DataState, FilterToolbar, TeamCard } from '../content/index.js';
  import type { TeamSummary } from '../content/TeamCard.svelte';
  interface Team extends TeamSummary { description: string; }
  interface Props { teams?: Team[]; }
  let { teams = [] }: Props = $props();
  let query = $state('');
  const i18n = useTranslation();
  const filtered = $derived(query ? teams.filter((team) => `${team.name} ${team.description}`.toLowerCase().includes(query.toLowerCase())) : teams);
</script>

<section class="svadmin-u-3e7ce58d64fa">
  <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-020ba687fa12 svadmin-u-9f76a62f4f44 svadmin-u-3b9871a0bf93"><div><h2 class="svadmin-u-4ee734926ff6 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('publicProfile.teamsCount', { count: filtered.length })}</h2><p class="svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('publicProfile.searchTeams')}</p></div></div>
  <FilterToolbar bind:query placeholder={i18n.t('publicProfile.searchTeams')} />
  {#if filtered.length === 0}<DataState state="empty" title={i18n.t('publicProfile.noTeams')} />{:else}<div class="svadmin-u-f3c543ad5fe9 svadmin-u-0c3bc98565dd svadmin-u-e4d6f343b9ff svadmin-u-b86f7f946cd8">{#each filtered as team (team.id)}<TeamCard {team} />{/each}</div>{/if}
</section>
