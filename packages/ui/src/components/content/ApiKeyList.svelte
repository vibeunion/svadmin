<script lang="ts">
  import { Copy, KeyRound, Trash2 } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import DataState from './DataState.svelte';
  import type { DataStateKind } from './DataState.svelte';
  export interface ApiKeySummary { id: string; name: string; prefix: string; createdAt?: string; lastUsedAt?: string; }
  interface Props { keys?: ApiKeySummary[]; state?: DataStateKind; stateTitle?: string; stateDescription?: string; retry?: () => void; retryLabel?: string; loadingLabel?: string; oncopy?: (key: ApiKeySummary) => void; onrevoke?: (key: ApiKeySummary) => void; class?: string; }
  const i18n = useTranslation();
  let { keys = [], state, stateTitle, stateDescription, retry, retryLabel, loadingLabel, oncopy, onrevoke, class: className = '' }: Props = $props();
  const resolvedState = $derived(state ?? (keys.length === 0 ? 'empty' : undefined));
  const isZh = $derived(i18n.locale === 'zh-CN');
</script>
{#if resolvedState}
  <DataState state={resolvedState} title={stateTitle} description={stateDescription} {retry} {retryLabel} {loadingLabel} class={className} />
{:else}
<div class={'divide-y divide-border overflow-hidden rounded-lg border border-border bg-card ' + className}>
  {#each keys as apiKey (apiKey.id)}
    <div class="flex flex-wrap items-center gap-3 px-4 py-3"><span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><KeyRound class="size-4" /></span><div class="min-w-0 flex-1"><p class="truncate text-sm font-medium text-foreground">{apiKey.name}</p><p class="font-mono text-xs text-muted-foreground">{apiKey.prefix}********</p></div><div class="text-right text-xs text-muted-foreground"><p>{apiKey.createdAt ?? (isZh ? '最近创建' : 'Created recently')}</p><p>{apiKey.lastUsedAt ?? (isZh ? '从未使用' : 'Never used')}</p></div><div class="flex items-center gap-1">{#if oncopy}<Button variant="ghost" size="icon-sm" aria-label={i18n.t('common.copy') + ' ' + apiKey.name} onclick={() => oncopy?.(apiKey)}><Copy class="size-4" /></Button>{/if}{#if onrevoke}<Button variant="ghost" size="icon-sm" aria-label={i18n.t('common.delete') + ' ' + apiKey.name} onclick={() => onrevoke?.(apiKey)}><Trash2 class="size-4" /></Button>{/if}</div></div>
  {/each}
</div>
{/if}
