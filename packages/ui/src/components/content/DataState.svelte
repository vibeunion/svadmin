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
  <div class={'space-y-3 rounded-lg border border-border bg-card p-5 ' + className} role="status" aria-live="polite" aria-label={resolvedLoadingLabel} aria-busy="true">
    <Skeleton class="h-5 w-40" /><Skeleton class="h-4 w-full max-w-md" /><Skeleton class="h-20 w-full" />
  </div>
{:else if state === 'error' || state === 'forbidden'}
  <Alert.Root variant={state === 'error' ? 'destructive' : 'warning'} class={className}>
    {#if state === 'error'}<AlertTriangle class="size-4" />{:else}<LockKeyhole class="size-4" />{/if}
    <Alert.Title>{resolvedTitle}</Alert.Title>
    <Alert.Description>{resolvedDescription}</Alert.Description>
    {#if retry}<Button variant="outline" size="sm" class="mt-3" onclick={retry}><RefreshCw class="size-3.5" />{resolvedRetryLabel}</Button>{/if}
    {#if action}<div class="mt-3">{@render action()}</div>{/if}
  </Alert.Root>
{:else}
  <div class={'flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-6 text-center ' + className}>
    <Inbox class="size-8 text-muted-foreground" /><h3 class="mt-3 text-sm font-semibold text-foreground">{resolvedTitle}</h3><p class="mt-1 max-w-sm text-sm text-muted-foreground">{resolvedDescription}</p>
    {#if action}<div class="mt-4">{@render action()}</div>{/if}
  </div>
{/if}
