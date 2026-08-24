<script lang="ts">
  import { MessageSquare, UserPlus } from '@lucide/svelte';
  import { Avatar } from '../ui/avatar/index.js';
  import { Button } from '../ui/button/index.js';
  import * as Card from '../ui/card/index.js';
  export interface NetworkUser { id: string; name: string; handle?: string; role?: string; avatar?: string; summary?: string; }
  interface Props { user: NetworkUser; onconnect?: () => void; onmessage?: () => void; class?: string; }
  let { user, onconnect, onmessage, class: className = '' }: Props = $props();
  const initials = $derived(user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase());
</script>
<Card.Card class={className}>
  <Card.CardContent class="flex items-start gap-3 p-4">
    <Avatar src={user.avatar} alt={user.name} fallback={initials} size="lg" />
    <div class="min-w-0 flex-1"><h3 class="truncate text-sm font-semibold text-foreground">{user.name}</h3>{#if user.handle}<p class="truncate text-xs text-muted-foreground">{user.handle}</p>{/if}{#if user.role}<p class="mt-2 text-xs font-medium text-foreground">{user.role}</p>{/if}{#if user.summary}<p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{user.summary}</p>{/if}</div>
    <div class="flex shrink-0 gap-1">{#if onmessage}<Button variant="ghost" size="icon-sm" aria-label={'Message ' + user.name} onclick={onmessage}><MessageSquare class="size-4" /></Button>{/if}{#if onconnect}<Button variant="outline" size="icon-sm" aria-label={'Connect with ' + user.name} onclick={onconnect}><UserPlus class="size-4" /></Button>{/if}</div>
  </Card.CardContent>
</Card.Card>
