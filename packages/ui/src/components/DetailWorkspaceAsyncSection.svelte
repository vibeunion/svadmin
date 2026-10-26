<script lang="ts" generics="T">
  import { untrack } from 'svelte';
  import type { Snippet } from 'svelte';
  import { captureAdminContext, captureAuthSession } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import DataState from './content/DataState.svelte';
  import type { DetailWorkspaceProvider, DetailWorkspaceScope } from './detail-workspace.js';

  let {
    provider,
    resourceName,
    recordId,
    render,
    empty,
    emptyTitle,
    errorTitle,
  }: {
    provider: DetailWorkspaceProvider<T>;
    resourceName: string;
    recordId: string | number;
    render: Snippet<[DetailWorkspaceScope & { data: T }]>;
    empty?: ((data: T) => boolean) | undefined;
    emptyTitle?: string | undefined;
    errorTitle?: string | undefined;
  } = $props();

  const i18n = useTranslation();
  const adminContext = captureAdminContext();
  let retryVersion = $state(0);
  let sectionState = $state<'loading' | 'ready' | 'empty' | 'error'>('loading');
  let data = $state.raw<T>();

  $effect(() => {
    const currentProvider = provider;
    const currentResourceName = resourceName;
    const currentRecordId = recordId;
    const isEmpty = empty;
    // Provider metadata carries tenant/resource configuration for the section request.
    const scopedMeta = adminContext.getProviderMeta(currentResourceName, { recordId: currentRecordId });
    const currentTenant = adminContext.tenant;
    const currentAuthProvider = adminContext.authProvider;
    const authScope = captureAuthSession(currentAuthProvider);
    const currentAccessControlProvider = adminContext.accessControlProvider;
    const currentAuditLogProvider = adminContext.auditLogProvider;
    let currentDataProvider: unknown;
    try {
      currentDataProvider = adminContext.providers
        ? adminContext.getDataProviderForResource(currentResourceName)
        : undefined;
    } catch {
      currentDataProvider = undefined;
    }
    void retryVersion;
    const controller = new AbortController();
    let active = true;
    const isCurrentScope = () => {
      if (!active || controller.signal.aborted) return false;
      if (adminContext.tenant !== currentTenant) return false;
      if (adminContext.authProvider !== currentAuthProvider || !authScope.isCurrent()) return false;
      if (adminContext.accessControlProvider !== currentAccessControlProvider) return false;
      if (adminContext.auditLogProvider !== currentAuditLogProvider) return false;
      try {
        const dataProvider = adminContext.providers
          ? adminContext.getDataProviderForResource(currentResourceName)
          : undefined;
        return dataProvider === currentDataProvider;
      } catch {
        return currentDataProvider === undefined;
      }
    };
    sectionState = 'loading';
    data = undefined;
    void (async () => {
      try {
        const result = await untrack(() => currentProvider.load({
          resourceName: currentResourceName,
          recordId: currentRecordId,
          ...(scopedMeta ? { meta: scopedMeta } : {}),
        }, controller.signal));
        if (!isCurrentScope()) return;
        data = result;
        sectionState = isEmpty?.(result) ? 'empty' : 'ready';
      } catch {
        if (isCurrentScope()) sectionState = 'error';
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  });
</script>

{#if sectionState === 'loading'}
  <div role="status" aria-live="polite" data-svadmin-detail-section-loading>
    {i18n.t('detailWorkspace.loading')}
  </div>
{:else if sectionState === 'error'}
  <div role="alert" data-svadmin-detail-section-error>
    <p>{errorTitle ?? i18n.t('common.operationFailed')}</p>
    <button type="button" onclick={() => retryVersion += 1}>{i18n.t('common.retry')}</button>
  </div>
{:else if sectionState === 'empty'}
  <DataState state="empty" title={emptyTitle ?? i18n.t('common.noData')} />
{:else if data !== undefined}
  {@render render({ resourceName, recordId, data })}
{/if}
