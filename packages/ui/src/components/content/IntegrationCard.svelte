<script lang="ts">
  import { Check, ExternalLink, PlugZap } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import { Badge } from '../ui/badge/index.js';
  import * as Card from '../ui/card/index.js';
  export interface IntegrationSummary { id: string; name: string; description?: string; account?: string; connected?: boolean; }
  interface Props { integration: IntegrationSummary; onconnect?: () => void; class?: string; }
  let { integration, onconnect, class: className = '' }: Props = $props();
</script>
<Card.Card class={className}>
  <Card.CardContent class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-1004c0c3954c svadmin-u-8e63407b5ceb">
    <span class="svadmin-u-60fbb7713999 svadmin-u-665f07fe73cc svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-2ef11f1cb219 svadmin-u-bfa603190748"><PlugZap class="svadmin-u-f7b5fa971871" /></span>
    <div class="svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c"><div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4"><h3 class="svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{integration.name}</h3>{#if integration.connected}<Badge variant="outline" class="svadmin-u-18a6e7a36f29 svadmin-u-17a9f7af2265 svadmin-u-76747e5e02ff"><Check class="svadmin-u-ef2d6f74d3d0" />Connected</Badge>{/if}</div><p class="svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{integration.description ?? 'Connect this provider to unlock synchronized workflows.'}</p>{#if integration.account}<p class="svadmin-u-50d0d216a2f8 svadmin-u-359090c2d529 svadmin-u-bfa603190748">{integration.account}</p>{/if}</div>
    {#if onconnect}<Button variant={integration.connected ? 'outline' : 'default'} size="sm" onclick={onconnect}>{integration.connected ? 'Manage' : 'Connect'}{#if !integration.connected}<ExternalLink class="svadmin-u-783b0d9d1e2c" />{/if}</Button>{/if}
  </Card.CardContent>
</Card.Card>
