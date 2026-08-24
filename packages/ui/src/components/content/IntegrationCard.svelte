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
  <Card.CardContent class="flex items-start gap-3 p-4">
    <span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><PlugZap class="size-4" /></span>
    <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h3 class="text-sm font-semibold text-foreground">{integration.name}</h3>{#if integration.connected}<Badge variant="outline" class="border-success/30 bg-success/10 text-success"><Check class="size-3" />Connected</Badge>{/if}</div><p class="mt-1 text-sm text-muted-foreground">{integration.description ?? 'Connect this provider to unlock synchronized workflows.'}</p>{#if integration.account}<p class="mt-2 text-xs text-muted-foreground">{integration.account}</p>{/if}</div>
    {#if onconnect}<Button variant={integration.connected ? 'outline' : 'default'} size="sm" onclick={onconnect}>{integration.connected ? 'Manage' : 'Connect'}{#if !integration.connected}<ExternalLink class="size-3.5" />{/if}</Button>{/if}
  </Card.CardContent>
</Card.Card>
