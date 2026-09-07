<script lang="ts">
  import { Check, Copy, KeyRound, Trash2 } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Badge } from '../ui/badge/index.js';
  import { Button } from '../ui/button/index.js';
  import DataState from './DataState.svelte';
  import type { DataStateKind } from './DataState.svelte';
  export interface ApiKeySummary {
    id: string;
    name: string;
    prefix: string;
    maskedToken?: string;
    createdAt?: string;
    lastUsedAt?: string;
    permissions?: string[];
  }
  interface Props { keys?: ApiKeySummary[]; state?: DataStateKind; stateTitle?: string; stateDescription?: string; retry?: () => void; retryLabel?: string; loadingLabel?: string; copiedKeyId?: string | null; oncopy?: (key: ApiKeySummary) => void; onrevoke?: (key: ApiKeySummary) => void; class?: string; }
  const i18n = useTranslation();
  let { keys = [], state, stateTitle, stateDescription, retry, retryLabel, loadingLabel, copiedKeyId = null, oncopy, onrevoke, class: className = '' }: Props = $props();
  const resolvedState = $derived(state ?? (keys.length === 0 ? 'empty' : undefined));
  const isZh = $derived(i18n.locale === 'zh-CN');
</script>
{#if resolvedState}
  <DataState state={resolvedState} title={stateTitle} description={stateDescription} {retry} {retryLabel} {loadingLabel} class={className} />
{:else}
<div class={'svadmin-u-fa6acbf81d74 svadmin-u-e783642739e3 svadmin-u-2cd02d11d1af svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 ' + className}>
  {#each keys as apiKey (apiKey.id)}
    <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c svadmin-u-f0faeb26d656 svadmin-u-1b2d54a3fd12">
      <span class="svadmin-u-60fbb7713999 svadmin-u-665f07fe73cc svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1"><KeyRound class="svadmin-u-f7b5fa971871" /></span>
      <div class="svadmin-u-4bdb6700d16a svadmin-u-36e579c0b41c">
        <p class="svadmin-u-f283ea9bea0e svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{apiKey.name}</p>
        <p class="svadmin-u-f283ea9bea0e svadmin-u-0e65706bcccd svadmin-u-359090c2d529 svadmin-u-bfa603190748">{apiKey.maskedToken ?? `${apiKey.prefix}********`}</p>
        {#if apiKey.permissions?.length}
          <div class="svadmin-u-50d0d216a2f8 svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-44ee8ba0a421">
            {#each apiKey.permissions as permission (permission)}<Badge variant="secondary" class="svadmin-u-d5eab218aa34 svadmin-u-68ecb30dbec6 svadmin-u-1dc571a3609f">{permission}</Badge>{/each}
          </div>
        {/if}
      </div>
      <div class="svadmin-u-2eba0d65d059 svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-0bf5f8e17abf"><p>{apiKey.createdAt ?? (isZh ? '最近创建' : 'Created recently')}</p><p>{apiKey.lastUsedAt ?? (isZh ? '从未使用' : 'Never used')}</p></div>
      <div class="svadmin-u-fb56d9cff341 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421">
        {#if oncopy}<Button variant="ghost" size="icon-sm" aria-label={i18n.t('common.copy') + ' ' + apiKey.name} onclick={() => oncopy?.(apiKey)}>{#if copiedKeyId === apiKey.id}<Check class="svadmin-u-f7b5fa971871 svadmin-u-76747e5e02ff" />{:else}<Copy class="svadmin-u-f7b5fa971871" />{/if}</Button>{/if}
        {#if onrevoke}<Button variant="ghost" size="icon-sm" aria-label={i18n.t('common.delete') + ' ' + apiKey.name} onclick={() => onrevoke?.(apiKey)}><Trash2 class="svadmin-u-f7b5fa971871" /></Button>{/if}
      </div>
    </div>
  {/each}
</div>
{/if}
