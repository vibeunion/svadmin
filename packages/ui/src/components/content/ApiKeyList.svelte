<script lang="ts">
  import { Copy, KeyRound, Trash2 } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  export interface ApiKeySummary { id: string; name: string; prefix: string; createdAt?: string; lastUsedAt?: string; }
  interface Props { keys?: ApiKeySummary[]; oncopy?: (key: ApiKeySummary) => void; onrevoke?: (key: ApiKeySummary) => void; class?: string; }
  let { keys = [], oncopy, onrevoke, class: className = '' }: Props = $props();
</script>
<div class={'divide-y divide-border overflow-hidden rounded-lg border border-border bg-card ' + className}>
  {#each keys as apiKey (apiKey.id)}
    <div class="flex flex-wrap items-center gap-3 px-4 py-3"><span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><KeyRound class="size-4" /></span><div class="min-w-0 flex-1"><p class="truncate text-sm font-medium text-foreground">{apiKey.name}</p><p class="font-mono text-xs text-muted-foreground">{apiKey.prefix}********</p></div><div class="text-right text-xs text-muted-foreground"><p>Created {apiKey.createdAt ?? 'Recently'}</p><p>Used {apiKey.lastUsedAt ?? 'Never'}</p></div><div class="flex items-center gap-1">{#if oncopy}<Button variant="ghost" size="icon-sm" aria-label={'Copy ' + apiKey.name} onclick={() => oncopy?.(apiKey)}><Copy class="size-4" /></Button>{/if}{#if onrevoke}<Button variant="ghost" size="icon-sm" aria-label={'Revoke ' + apiKey.name} onclick={() => onrevoke?.(apiKey)}><Trash2 class="size-4" /></Button>{/if}</div></div>
  {/each}
  {#if keys.length === 0}<div class="p-6 text-center text-sm text-muted-foreground">No API keys</div>{/if}
</div>
