<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Card from '../ui/card/index.js';
  import { Button } from '../ui/button/index.js';
  import { Avatar } from '../ui/avatar/index.js';
  import { Input } from '../ui/input/index.js';
  import { Users, ArrowRight, Search, Star } from '@lucide/svelte';

  const i18n = useTranslation();

  interface TeamMember {
    name: string;
    avatar?: string;
    role?: string;
  }

  interface Team {
    id: string;
    name: string;
    description: string;
    members: TeamMember[];
    totalMembers: number;
    color?: string;
    rating?: number;
  }

  interface Props {
    teams?: Team[];
  }

  let { teams = [] }: Props = $props();

  let searchQuery = $state('');
  const filtered = $derived(
    searchQuery
      ? teams.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase()))
      : teams
  );

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
</script>

<div class="space-y-4">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h3 class="text-lg font-semibold text-foreground">{i18n.t('publicProfile.teamsCount', { count: filtered.length })}</h3>
    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input placeholder={i18n.t('publicProfile.searchTeams')} bind:value={searchQuery} class="w-48 pl-9" />
    </div>
  </div>

  {#if filtered.length === 0}
    <div class="rounded-xl border border-dashed border-border/60 p-8 text-center">
      <p class="text-sm text-muted-foreground">{i18n.t('publicProfile.noTeams')}</p>
    </div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {#each filtered as team (team.id)}
        <Card.Card class="border-border/60 hover:border-primary/30 transition-colors">
          <Card.CardContent class="p-4 space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-3">
                {#if team.color}
                  <div class="h-8 w-8 rounded-lg" style="background-color: {team.color}20;">
                    <Users class="h-4 w-4" style="color: {team.color}" />
                  </div>
                {:else}
                  <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Users class="h-4 w-4" />
                  </div>
                {/if}
                <div>
                  <h4 class="font-semibold text-foreground">{team.name}</h4>
                  <p class="text-xs text-muted-foreground">{i18n.t('publicProfile.projectMembers', { count: team.totalMembers })}</p>
                </div>
              </div>
              {#if team.rating}
                <span class="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-500">
                  <Star class="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{team.rating}
                </span>
              {/if}
            </div>

            <p class="text-sm text-muted-foreground line-clamp-2">{team.description}</p>

            <!-- Member avatars -->
            <div class="flex items-center gap-1">
              {#each team.members.slice(0, 5) as member (member.name)}
                {#if member.avatar}
                  <Avatar class="h-7 w-7 ring-1 ring-background">
                    <img src={member.avatar} alt={member.name} />
                  </Avatar>
                {:else}
                  <div class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-1 ring-background">
                    {initials(member.name)}
                  </div>
                {/if}
              {/each}
              {#if team.members.length > 5}
                <div class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-1 ring-background">
                  +{team.members.length - 5}
                </div>
              {/if}
            </div>

            <div class="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" class="flex-1">
                {i18n.t('publicProfile.join')}
              </Button>
              <Button variant="ghost" size="sm" class="flex-1">
                {i18n.t('publicProfile.viewProfile')} <ArrowRight class="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </Card.CardContent>
        </Card.Card>
      {/each}
    </div>
  {/if}
</div>
