<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { AlertTriangle, Inbox, LockKeyhole, RefreshCw } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import * as Alert from '../ui/alert/index.js';
  import { Skeleton } from '../ui/skeleton/index.js';
  export type BlockingDataStateKind = 'loading' | 'empty' | 'filtered-empty' | 'error' | 'forbidden';
  export type DataStateKind = BlockingDataStateKind | 'refreshing';
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
    refreshing: [isZh ? '正在刷新…' : 'Refreshing…', ''],
    empty: [i18n.t('empty.title'), i18n.t('empty.description')],
    'filtered-empty': [isZh ? '没有匹配结果' : 'No matching results', isZh ? '请调整或清除筛选条件。' : 'Adjust or clear your filters.'],
    error: [i18n.t('common.error'), i18n.t('common.operationFailed')],
    forbidden: [isZh ? '无权访问' : 'Access restricted', isZh ? '你没有查看此内容的权限。' : 'You do not have permission to view this content.'],
  } as const);
  const resolvedTitle = $derived(title ?? defaults[state][0]);
  const resolvedDescription = $derived(description ?? defaults[state][1]);
  const resolvedRetryLabel = $derived(retryLabel ?? i18n.t('common.retry'));
  const resolvedLoadingLabel = $derived(loadingLabel ?? i18n.t('common.loading'));
</script>

{#if state === 'loading'}
  <div data-svadmin-data-state={state} class={'space-y-3 rounded-lg border border-border bg-card p-5 ' + className} role="status" aria-live="polite" aria-label={resolvedLoadingLabel} aria-busy="true">
    <Skeleton class="h-5 w-40" /><Skeleton class="h-4 w-full max-w-md" /><Skeleton class="h-20 w-full" />
  </div>
{:else if state === 'refreshing'}
  <div data-svadmin-data-state={state} class={'inline-flex items-center gap-2 text-xs text-muted-foreground ' + className} role="status" aria-live="polite" aria-label={resolvedTitle} aria-busy="true">
    <RefreshCw class="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
    <span>{resolvedTitle}</span>
  </div>
{:else if state === 'error' || state === 'forbidden'}
  <Alert.Root data-svadmin-data-state={state} variant={state === 'error' ? 'destructive' : 'warning'} class={className}>
    {#if state === 'error'}<AlertTriangle class="size-4" aria-hidden="true" />{:else}<LockKeyhole class="size-4" aria-hidden="true" />{/if}
    <Alert.Title>{resolvedTitle}</Alert.Title>
    <Alert.Description>{resolvedDescription}</Alert.Description>
    {#if retry}<Button variant="outline" size="sm" class="mt-3" onclick={retry}><RefreshCw class="size-3.5" aria-hidden="true" />{resolvedRetryLabel}</Button>{/if}
    {#if action}<div class="mt-3">{@render action()}</div>{/if}
  </Alert.Root>
{:else}
  <div data-svadmin-data-state={state} class={'empty-state ' + className} role="status" aria-live="polite">
    <span class="empty-state__icon" aria-hidden="true">
      <Inbox size={16} />
    </span>
    <div class="empty-state__body">
      <h3>{resolvedTitle}</h3>
      {#if resolvedDescription}<p>{resolvedDescription}</p>{/if}
      {#if action}<div class="empty-state__action">{@render action()}</div>{/if}
    </div>
  </div>
{/if}

<style>
  .empty-state { display: flex; align-items: flex-start; gap: 12px; padding: 16px; text-align: left; color: var(--foreground); }
  .empty-state__icon { display: flex; align-items: center; justify-content: center; flex: 0 0 32px; height: 32px; border-radius: 6px; background: var(--muted); color: var(--muted-foreground); }
  .empty-state__body { min-width: 0; flex: 1; overflow-wrap: anywhere; }
  .empty-state h3 { margin: 0; font-size: var(--svadmin-text-label); line-height: var(--svadmin-leading-body); font-weight: 600; letter-spacing: 0; }
  .empty-state p { margin: var(--svadmin-space-1) 0 0; font-size: var(--svadmin-text-label); line-height: var(--svadmin-leading-body); color: var(--muted-foreground); }
  .empty-state__action { margin-top: 12px; }
</style>
