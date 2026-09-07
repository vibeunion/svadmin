<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { AlertTriangle, Inbox, LockKeyhole, RefreshCw } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import * as Alert from '../ui/alert/index.js';
  import { Skeleton } from '../ui/skeleton/index.js';
  export type DataStateKind = 'loading' | 'empty' | 'error' | 'forbidden';
  interface Props {
    state: DataStateKind;
    title?: string;
    description?: string;
    retry?: () => void;
    retryLabel?: string;
    loadingLabel?: string;
    action?: Snippet;
    class?: string;
  }
  const i18n = useTranslation();
  let {
    state,
    title,
    description,
    retry,
    retryLabel,
    loadingLabel,
    action,
    class: className = '',
  }: Props = $props();
  const isZh = $derived(i18n.locale === 'zh-CN');
  const defaults = $derived({
    loading: [i18n.t('common.loading'), i18n.t('common.loading')],
    empty: [i18n.t('empty.title'), i18n.t('empty.description')],
    error: [i18n.t('common.error'), i18n.t('common.retry')],
    forbidden: [isZh ? '无权访问' : 'Access restricted', isZh ? '你没有查看此内容的权限。' : 'You do not have permission to view this content.'],
  } as const);
  const resolvedTitle = $derived(title ?? defaults[state][0]);
  const resolvedDescription = $derived(description ?? defaults[state][1]);
  const resolvedRetryLabel = $derived(retryLabel ?? i18n.t('common.retry'));
  const resolvedLoadingLabel = $derived(loadingLabel ?? i18n.t('common.loading'));
</script>

{#if state === 'loading'}
  <div class={'svadmin-u-6ed543e2fbbb svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-c07e54fd1439 ' + className} role="status" aria-live="polite" aria-label={resolvedLoadingLabel} aria-busy="true">
    <Skeleton class="svadmin-u-cd0d9c512cdc svadmin-u-84789e8a20cd" /><Skeleton class="svadmin-u-11e59c6d5f6b svadmin-u-6da6a3c3f741 svadmin-u-9794ab45094d" /><Skeleton class="svadmin-u-0a769880db93 svadmin-u-6da6a3c3f741" />
  </div>
{:else if state === 'error' || state === 'forbidden'}
  <Alert.Root variant={state === 'error' ? 'destructive' : 'warning'} class={className}>
    {#if state === 'error'}<AlertTriangle class="svadmin-u-f7b5fa971871" aria-hidden="true" />{:else}<LockKeyhole class="svadmin-u-f7b5fa971871" aria-hidden="true" />{/if}
    <Alert.Title>{resolvedTitle}</Alert.Title>
    <Alert.Description>{resolvedDescription}</Alert.Description>
    {#if retry}<Button variant="outline" size="sm" class="svadmin-u-eccd13ef4f2f" onclick={retry}><RefreshCw class="svadmin-u-783b0d9d1e2c" aria-hidden="true" />{resolvedRetryLabel}</Button>{/if}
    {#if action}<div class="svadmin-u-eccd13ef4f2f">{@render action()}</div>{/if}
  </Alert.Root>
{:else}
  <div class={'svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-a29b7a649c77 svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-f92d02360b8f svadmin-u-a1f611f027dd svadmin-u-ca6bf63030aa ' + className} role="status" aria-live="polite">
    <Inbox class="svadmin-u-d8f5213f0fe0 svadmin-u-bfa603190748" aria-hidden="true" /><h3 class="svadmin-u-eccd13ef4f2f svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{resolvedTitle}</h3><p class="svadmin-u-b6b02c0ebef6 svadmin-u-2472e9b81a97 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{resolvedDescription}</p>
    {#if action}<div class="svadmin-u-0ab8667228fd">{@render action()}</div>{/if}
  </div>
{/if}
