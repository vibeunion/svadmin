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
    members?: Array<{ id?: string; name: string; avatar?: string; role?: string }>;
    color?: string;
    rating?: number;
  }
  interface Props { team: TeamSummary; onjoin?: () => void; onclick?: () => void; class?: string; }
  let { team, onjoin, onclick, class: className = '' }: Props = $props();
  const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
</script>
<Card.Card data-interactive={onclick ? 'true' : undefined} class={'svadmin-u-668b21aa5409 ' + className}>
  <Card.CardContent class="svadmin-u-60fbb7713999 svadmin-u-668b21aa5409 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-8e63407b5ceb">
    <div class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-1004c0c3954c"><span class="svadmin-u-60fbb7713999 svadmin-u-665f07fe73cc svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1" style:background-color={team.color ? `${team.color}20` : undefined}><Users class="svadmin-u-f7b5fa971871" style={team.color ? `color: ${team.color}` : undefined} /></span><div class="svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c"><h3 class="svadmin-u-f283ea9bea0e svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{team.name}</h3><p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{team.totalMembers ?? team.members?.length ?? 0} members</p></div>{#if team.rating}<span class="svadmin-u-359090c2d529 svadmin-u-e83a7042bc91 svadmin-u-918184635b1d">{team.rating}</span>{/if}</div>
    {#if team.description}<p class="svadmin-u-054cb4e36116 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{team.description}</p>{/if}
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421">{#each (team.members ?? []).slice(0, 5) as member, index (member.id ?? member.name + '-' + index)}<Avatar src={member.avatar} alt={member.name} fallback={initials(member.name)} size="sm" class="svadmin-u-8956a4275b9d svadmin-u-16b1efa5875e svadmin-u-21752b56424c" />{/each}</div>
    <div class="svadmin-u-9953408a8ef3 svadmin-u-60fbb7713999 svadmin-u-77a2a20e90d4 svadmin-u-b950dda299d3 svadmin-u-18049387f0af svadmin-u-ce335a8e4f56">{#if onjoin}<Button variant="outline" size="sm" class="svadmin-u-36e579c0b41c" onclick={onjoin}>Join</Button>{/if}{#if onclick}<Button variant="ghost" size="sm" class="svadmin-u-36e579c0b41c" onclick={onclick}>View <ArrowRight class="svadmin-u-783b0d9d1e2c" /></Button>{/if}</div>
  </Card.CardContent>
</Card.Card>
