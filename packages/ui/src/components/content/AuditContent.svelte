<script lang="ts">
  import type { Snippet } from 'svelte';
  import { definedOptions } from '@svadmin/core/options';
  import { useTranslation } from '@svadmin/core/i18n';
  import DataState from './DataState.svelte';
  import { Button } from '../ui/button/index.js';
  import { RefreshCw } from '@lucide/svelte';
  import type { AuditDataState } from './audit-state.js';

  let { state = 'ready', message, retry, children }: {
    state?: AuditDataState;
    message?: string | undefined;
    retry?: (() => void) | undefined;
    children?: Snippet | undefined;
  } = $props();
  const i18n = useTranslation();
</script>

{#if state === 'loading' || state === 'empty' || state === 'error' || state === 'forbidden'}
  <DataState {state} {...definedOptions({ title: message, retry: state === 'error' ? retry : undefined })} />
{:else}
  {#if state === 'partial' || state === 'readonly'}
    <div class="svadmin-audit-notice" data-state={state} role="status">
      <span>{message ?? (state === 'partial'
        ? (i18n.locale === 'zh-CN' ? '部分数据暂不可用' : 'Some data is unavailable')
        : (i18n.locale === 'zh-CN' ? '只读' : 'Read only'))}</span>
      {#if state === 'partial' && retry}
        <Button variant="outline" size="sm" onclick={retry}><RefreshCw size={16} aria-hidden="true" />{i18n.t('common.retry')}</Button>
      {/if}
    </div>
  {/if}
  {@render children?.()}
{/if}
