<script lang="ts">
  import { ArrowRight, Users } from '@lucide/svelte';
  import { Avatar } from '../ui/avatar/index.js';
  import { Button } from '../ui/button/index.js';
  import * as Card from '../ui/card/index.js';
  export interface TeamSummary {
    id: string;
    name: string;
    description?: string;
    totalMembers?: number;
    members?: Array<{ id?: string; name: string; avatar?: string }>;
  }
  interface Props { team: TeamSummary; onjoin?: () => void; onclick?: () => void; class?: string; }
  let { team, onjoin, onclick, class: className = '' }: Props = $props();
  const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
</script>
<Card.Card data-interactive={onclick ? 'true' : undefined} class={'h-full ' + className}>
  <Card.CardContent class="flex h-full flex-col gap-3 p-4">
    <div class="flex items-start gap-3"><span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Users class="size-4" /></span><div class="min-w-0 flex-1"><h3 class="truncate text-sm font-semibold text-foreground">{team.name}</h3><p class="text-xs text-muted-foreground">{team.totalMembers ?? team.members?.length ?? 0} members</p></div></div>
    {#if team.description}<p class="line-clamp-2 text-sm text-muted-foreground">{team.description}</p>{/if}
    <div class="flex items-center gap-1">{#each (team.members ?? []).slice(0, 5) as member, index (member.id ?? member.name + '-' + index)}<Avatar src={member.avatar} alt={member.name} fallback={initials(member.name)} size="sm" class="-mr-1 ring-2 ring-card" />{/each}</div>
    <div class="mt-auto flex gap-2 border-t border-border pt-3">{#if onjoin}<Button variant="outline" size="sm" class="flex-1" onclick={onjoin}>Join</Button>{/if}{#if onclick}<Button variant="ghost" size="sm" class="flex-1" onclick={onclick}>View <ArrowRight class="size-3.5" /></Button>{/if}</div>
  </Card.CardContent>
</Card.Card>
