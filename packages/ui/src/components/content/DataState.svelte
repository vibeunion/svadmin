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
  <div class={'empty-state ' + className} role="status" aria-live="polite">
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
  .empty-state h3 { margin: 0; font-size: 14px; line-height: 20px; font-weight: 600; letter-spacing: 0; }
  .empty-state p { margin: 4px 0 0; font-size: 14px; line-height: 20px; color: var(--muted-foreground); }
  .empty-state__action { margin-top: 12px; }
</style>
