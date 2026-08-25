<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Check, MessageSquare, Plus } from '@lucide/svelte';
  import { Avatar } from '../ui/avatar/index.js';
  import { Badge } from '../ui/badge/index.js';
  import { Button } from '../ui/button/index.js';
  import * as Card from '../ui/card/index.js';
  export interface NetworkUser { id: string; name: string; handle?: string; role?: string; avatar?: string; summary?: string; }
  export interface NetworkMetric { label: string; value: string | number; }
  interface Props {
    user: NetworkUser;
    tags?: string[];
    metrics?: NetworkMetric[];
    verified?: boolean;
    verifiedLabel?: string;
    connected?: boolean;
    connectLabel?: string;
    connectedLabel?: string;
    onconnect?: () => void;
    onmessage?: () => void;
    footer?: Snippet;
    class?: string;
  }
  let {
    user,
    tags = [],
    metrics = [],
    verified = false,
    verifiedLabel = 'Verified',
    connected = false,
    connectLabel = 'Connect',
    connectedLabel = 'Connected',
    onconnect,
    onmessage,
    footer,
    class: className = '',
  }: Props = $props();
  const initials = $derived(user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase());
</script>
<Card.Card class={className}>
  <Card.CardContent class="space-y-4 p-4">
    <div class="flex items-start gap-3">
      <Avatar src={user.avatar} alt={user.name} fallback={initials} size="lg" />
      <div class="min-w-0 flex-1">
        <div class="flex min-w-0 items-center gap-1.5"><h3 class="truncate text-sm font-semibold text-foreground">{user.name}</h3>{#if verified}<Check class="size-3.5 shrink-0 text-primary" aria-label={verifiedLabel} />{/if}</div>
        {#if user.handle}<p class="truncate text-xs text-muted-foreground">{user.handle}</p>{/if}
        {#if user.role}<p class="mt-2 text-xs font-medium text-foreground">{user.role}</p>{/if}
      </div>
      {#if onmessage}<Button variant="ghost" size="icon-sm" aria-label={'Message ' + user.name} onclick={onmessage}><MessageSquare class="size-4" /></Button>{/if}
    </div>
    {#if user.summary}<p class="text-sm leading-5 text-muted-foreground">{user.summary}</p>{/if}
    {#if tags.length > 0}<div class="flex flex-wrap gap-1.5">{#each tags as tag (tag)}<Badge variant="outline">{tag}</Badge>{/each}</div>{/if}
    {#if metrics.length > 0}<dl class="grid gap-2 border-t border-border pt-3 text-center" style:grid-template-columns={`repeat(${metrics.length}, minmax(0, 1fr))`}>{#each metrics as metric (metric.label)}<div class="min-w-0"><dd class="truncate text-sm font-semibold text-foreground">{metric.value}</dd><dt class="mt-1 truncate text-xs text-muted-foreground">{metric.label}</dt></div>{/each}</dl>{/if}
    {#if onconnect}<Button size="sm" variant={connected ? 'outline' : 'default'} class="w-full" onclick={onconnect}>{#if connected}<Check class="size-3.5" />{connectedLabel}{:else}<Plus class="size-3.5" />{connectLabel}{/if}</Button>{/if}
    {#if footer}<div class="border-t border-border pt-3">{@render footer()}</div>{/if}
  </Card.CardContent>
</Card.Card>
