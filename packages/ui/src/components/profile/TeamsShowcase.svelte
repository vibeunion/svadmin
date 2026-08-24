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

<section class="space-y-4">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 class="text-base font-semibold text-foreground">{i18n.t('publicProfile.teamsCount', { count: filtered.length })}</h2><p class="mt-1 text-sm text-muted-foreground">{i18n.t('publicProfile.searchTeams')}</p></div></div>
  <FilterToolbar bind:query placeholder={i18n.t('publicProfile.searchTeams')} />
  {#if filtered.length === 0}<DataState state="empty" title={i18n.t('publicProfile.noTeams')} />{:else}<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{#each filtered as team (team.id)}<TeamCard {team} />{/each}</div>{/if}
</section>
