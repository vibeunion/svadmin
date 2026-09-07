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
  <Card.CardContent class="svadmin-u-3e7ce58d64fa svadmin-u-8e63407b5ceb">
    <div class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-1004c0c3954c">
      <Avatar src={user.avatar} alt={user.name} fallback={initials} size="lg" />
      <div class="svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c">
        <div class="svadmin-u-60fbb7713999 svadmin-u-7e0b7cdf1a94 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568"><h3 class="svadmin-u-f283ea9bea0e svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{user.name}</h3>{#if verified}<Check class="svadmin-u-783b0d9d1e2c svadmin-u-012fbd121f37 svadmin-u-20aaf08a7ed1" aria-label={verifiedLabel} />{/if}</div>
        {#if user.handle}<p class="svadmin-u-f283ea9bea0e svadmin-u-359090c2d529 svadmin-u-bfa603190748">{user.handle}</p>{/if}
        {#if user.role}<p class="svadmin-u-50d0d216a2f8 svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{user.role}</p>{/if}
      </div>
      {#if onmessage}<Button variant="ghost" size="icon-sm" aria-label={'Message ' + user.name} onclick={onmessage}><MessageSquare class="svadmin-u-f7b5fa971871" /></Button>{/if}
    </div>
    {#if user.summary}<p class="svadmin-u-fc7473ca09eb svadmin-u-7054e2767710 svadmin-u-bfa603190748">{user.summary}</p>{/if}
    {#if tags.length > 0}<div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-58284b4ea568">{#each tags as tag (tag)}<Badge variant="outline">{tag}</Badge>{/each}</div>{/if}
    {#if metrics.length > 0}<dl class="svadmin-u-f3c543ad5fe9 svadmin-u-77a2a20e90d4 svadmin-u-b950dda299d3 svadmin-u-18049387f0af svadmin-u-ce335a8e4f56 svadmin-u-ca6bf63030aa" style:grid-template-columns={`repeat(${metrics.length}, minmax(0, 1fr))`}>{#each metrics as metric (metric.label)}<div class="svadmin-u-7e0b7cdf1a94"><dd class="svadmin-u-f283ea9bea0e svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{metric.value}</dd><dt class="svadmin-u-b6b02c0ebef6 svadmin-u-f283ea9bea0e svadmin-u-359090c2d529 svadmin-u-bfa603190748">{metric.label}</dt></div>{/each}</dl>{/if}
    {#if onconnect}<Button size="sm" variant={connected ? 'outline' : 'default'} class="svadmin-u-6da6a3c3f741" onclick={onconnect}>{#if connected}<Check class="svadmin-u-783b0d9d1e2c" />{connectedLabel}{:else}<Plus class="svadmin-u-783b0d9d1e2c" />{connectLabel}{/if}</Button>{/if}
    {#if footer}<div class="svadmin-u-b950dda299d3 svadmin-u-18049387f0af svadmin-u-ce335a8e4f56">{@render footer()}</div>{/if}
  </Card.CardContent>
</Card.Card>
