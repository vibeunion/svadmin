<script lang="ts">
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core/i18n';
  import { captureAdminContext, captureAuthSession, type RegisteredAccessControlProvider } from '@svadmin/core';
  import { buildPivot, buildPivotCacheKey, buildPivotDrilldown, decodePivotResult, snapshotPivotQuery, formatPivotValue, type PivotCache, type PivotProvider, type PivotQuery, type PivotResult, type PivotDrilldown } from '@svadmin/core/pivot';
  import type { Filter } from '@svadmin/core';
  import { definedOptions } from '@svadmin/core/options';
  import { snapshotPlainData } from '@svadmin/core/schema';
  import { RotateCw } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';

  export type AggregationFn = import('@svadmin/core/pivot').PivotAggregation;

  interface Props {
    data?: Record<string, unknown>[];
    rowField: string;
    rowLabel?: string;
    columnField: string;
    columnLabel?: string;
    valueField: string;
    valueLabel?: string;
    aggregator?: AggregationFn;
    formatValue?: (val: number) => string;
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
    onDrillDown?: (input: PivotDrilldown) => void | Promise<void>;
    ariaLabel?: string;
    class?: string;
    resource?: string;
    provider?: PivotProvider;
    cache?: PivotCache;
    /** 由宿主提供的身份、租户和授权版本作用域键；服务端模式必须非空。 */
    scopeKey?: string;
    filters?: Filter[];
    meta?: Record<string, unknown>;
    enabled?: boolean;
    accessCheck?: boolean;
    aggregateData?: unknown;
  }

  let {
    data = [],
    rowField,
    rowLabel = rowField,
    columnField,
    columnLabel = columnField,
    valueField,
    valueLabel = valueField,
    aggregator = 'sum',
    formatValue,
    loading = false,
    error,
    onRetry,
    onDrillDown,
    ariaLabel,
    class: className = '',
    resource = '',
    provider,
    cache,
    scopeKey,
    filters,
    meta,
    enabled = true,
    accessCheck = true,
    aggregateData,
  }: Props = $props();

  const i18n = useTranslation();
  const adminContext = captureAdminContext();
  const authScope = $derived(captureAuthSession(adminContext.authProvider));
  const tenantScope = $derived(adminContext.tenantCacheKey?.__svadminTenant);
  const permissionProvider = $derived(accessCheck ? adminContext.accessControlProvider : null);
  let remotePivot = $state<PivotResult | undefined>(undefined);
  let remoteLoading = $state(false);
  let remoteError = $state<PivotResult['error']>();
  let remotePermissionDenied = $state(false);
  let retryVersion = $state(0);
  let requestEpoch = 0;
  let requestOwner = $state.raw<{
    provider: PivotProvider | undefined;
    query: PivotQuery | undefined;
    scope: string | undefined;
    enabled: boolean;
    retry: number;
    permission: RegisteredAccessControlProvider | null;
    cache: PivotCache | undefined;
    cacheProviderKey: string | undefined;
    authScope: ReturnType<typeof captureAuthSession>;
    tenantScope: typeof tenantScope;
  }>();
  const remoteQuery = $derived(snapshotPivotQuery(definedOptions({
    resource, rowField, columnField, valueField, aggregator, filters, meta,
  })));
  const ownerMatches = $derived(requestOwner?.provider === provider && requestOwner?.query === remoteQuery
    && requestOwner?.scope === scopeKey && requestOwner?.enabled === enabled && requestOwner?.retry === retryVersion
    && requestOwner?.permission === permissionProvider && requestOwner?.cache === cache
    && requestOwner?.cacheProviderKey === cache?.providerKey
    && requestOwner?.authScope === authScope && requestOwner?.tenantScope === tenantScope);
  $effect(() => {
    const activeProvider = provider;
    const query = remoteQuery;
    const scope = scopeKey;
    const allowed = enabled;
    const permission = permissionProvider;
    const activeCache = cache;
    const cacheProviderKey = activeCache?.providerKey;
    const activeAuthScope = authScope;
    const activeTenantScope = tenantScope;
    const retry = retryVersion;
    requestOwner = {
      provider: activeProvider, query, scope, enabled: allowed, retry, permission,
      cache: activeCache, cacheProviderKey, authScope: activeAuthScope, tenantScope: activeTenantScope,
    };
    remotePivot = undefined;
    remoteLoading = false;
    remoteError = undefined;
    remotePermissionDenied = false;
    if (!activeProvider) {
      return;
    }
    if (!allowed) return;
    if (!activeAuthScope.available) {
      remotePermissionDenied = true;
      return;
    }
    if (!query || typeof scope !== 'string' || !scope.trim()) {
      remoteError = 'invalidData';
      return;
    }
    const epoch = ++requestEpoch;
    const current = () => epoch === requestEpoch && ownerMatches && activeAuthScope.isCurrent()
      && activeTenantScope === tenantScope;
    const denied = {};
    remoteLoading = true;
    void Promise.resolve().then(async () => {
      if (!current()) return undefined;
      if (permission) {
        const result = await permission.can(definedOptions({
          resource: query.resource, action: 'show', meta: query.meta,
        }));
        if (!result.can) throw denied;
      }
      if (!current()) return undefined;
      const request = snapshotPivotQuery(query);
      if (!request) throw new Error('Invalid pivot query');
      const baseCacheKey = activeCache ? buildPivotCacheKey(request, scope, cacheProviderKey) : undefined;
      if (activeCache && !baseCacheKey) throw new Error('Invalid cache namespace');
      const cacheKey = baseCacheKey
        ? JSON.stringify([baseCacheKey, activeAuthScope.cacheKey, activeTenantScope ?? null]) : undefined;
      if (activeCache && cacheKey) {
        try {
          const cached = snapshotPlainData(await activeCache.get(cacheKey));
          if (!current()) return undefined;
          if (cached !== undefined && !decodePivotResult(cached).error) return cached;
        } catch { /* 缓存不可用时仍允许读取当前数据源。 */ }
      }
      if (!current()) return undefined;
      const value = await activeProvider.aggregate(request);
      if (!current()) return undefined;
      if (activeCache && cacheKey && !decodePivotResult(value).error) {
        try { await activeCache.set(cacheKey, snapshotPlainData(value)); }
        catch { /* 缓存写入失败不遮蔽有效聚合结果。 */ }
      }
      return value;
    }).then(value => {
      if (!current()) return;
      const decoded = decodePivotResult(value);
      if (decoded.error) {
        remotePivot = undefined;
        remoteError = decoded.error;
      } else {
        remotePivot = decoded;
      }
      remoteLoading = false;
    }).catch(cause => {
      if (!current()) return;
      remotePivot = undefined;
      remoteLoading = false;
      remotePermissionDenied = cause === denied;
      remoteError = cause === denied ? undefined : 'invalidData';
    });
    return () => { requestEpoch += 1; };
  });
  const emptyPivot = buildPivot([], { rowField: 'row', columnField: 'column', valueField: 'value' });
  const pivot: PivotResult = $derived(provider
    ? (enabled && ownerMatches ? remotePivot ?? emptyPivot : emptyPivot)
    : aggregateData !== undefined ? decodePivotResult(aggregateData)
    : buildPivot(loading || error ? [] : data, { rowField, columnField, valueField, aggregator }));
  const effectiveLoading = $derived(provider ? enabled && (!ownerMatches || remoteLoading || loading) : loading);
  const displayError = $derived(error || (provider && ownerMatches && enabled && remotePermissionDenied ? i18n.t('common.accessDenied') : '') || (provider && ownerMatches && enabled && remoteError ? i18n.t(`pivot.${remoteError}`) : '') || (pivot.error ? i18n.t(`pivot.${pivot.error}`) : ''));
  function display(value: number | null | undefined): string {
    return formatPivotValue(value, formatValue ?? (v => v.toLocaleString(i18n.locale, { maximumFractionDigits: 2 })));
  }
  const drillContext = $derived({
    pivot, query: remoteQuery, scope: scopeKey, handler: onDrillDown,
    ready: enabled && !effectiveLoading && !displayError && (!provider || ownerMatches),
  });
  let drillPending = $state.raw<object>();
  let drillError = $state.raw<object>();
  const canDrill = $derived(drillContext.ready && !!onDrillDown && !!remoteQuery
    && typeof scopeKey === 'string' && !!scopeKey.trim() && scopeKey.length <= 4000);

  async function drillDown(context: typeof drillContext, rowKey: string, columnKey: string) {
    if (context !== drillContext || !canDrill || drillPending === context || !context.handler) return;
    const row = context.pivot.rows.find(item => item.key === rowKey);
    const column = context.pivot.columns.find(item => item.key === columnKey);
    if (!context.pivot.cells.get(rowKey)?.has(columnKey)) return;
    const input = buildPivotDrilldown(context.query, context.scope, row, column);
    if (!input) return;
    drillPending = context;
    drillError = undefined;
    try {
      await context.handler(input);
    } catch {
      if (context === drillContext) drillError = context;
    } finally {
      if (drillPending === context) drillPending = undefined;
    }
  }
</script>

<div aria-busy={effectiveLoading} class={cn('svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-8e63407b5ceb svadmin-u-cef5b893cf23 svadmin-u-359090c2d529 svadmin-u-6ed543e2fbbb', className)}>
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-f4cc511ff0c1 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
    <div class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">
      {i18n.t('pivot.title')} <span class="svadmin-u-bfa603190748 svadmin-u-8ecebc9f80e6">({rowLabel} × {columnLabel})</span>
    </div>
    <div class="svadmin-u-bfa603190748">
      <strong class="svadmin-u-20aaf08a7ed1">{i18n.t(`pivot.${aggregator}`)}</strong> ({valueLabel})
    </div>
  </div>

  {#if effectiveLoading}
    <div role="status">{i18n.t('common.loading')}</div>
  {:else if displayError}
    <div role="alert">{displayError}</div>
    {#if (error && onRetry) || (provider && enabled && remoteError)}
      <Button type="button" variant="ghost" size="sm" onclick={() => {
        if (error) onRetry?.();
        else retryVersion += 1;
      }}><RotateCw aria-hidden="true" />{i18n.t('common.retry')}</Button>
    {/if}
  {:else if pivot.rows.length === 0}
    <div role="status">{i18n.t('common.noData')}</div>
  {:else}
  {@const context = drillContext}
  {#if drillError === context}<p role="alert">{i18n.t('pivot.drilldownFailed')}</p>{/if}
  <div class="svadmin-u-1384f66f41d0 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff" style="overflow-x: auto;">
    <table aria-label={ariaLabel ?? `${i18n.t('pivot.title')}: ${rowLabel} / ${columnLabel} / ${valueLabel}`} class="svadmin-u-6da6a3c3f741 svadmin-u-308fc069e46e svadmin-u-4583f90cd9bd">
      <thead class="svadmin-u-b00f43c30c2b svadmin-u-e83a7042bc91 svadmin-u-bfa603190748 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
        <tr>
          <th scope="col" class="svadmin-u-0e17f2bd9074 svadmin-u-e7ee55ac7ffe svadmin-u-2eba0d65d059 svadmin-u-706701550477">{rowLabel} \ {columnLabel}</th>
          {#each pivot.columns as col (col.key)}
            <th scope="col" class="svadmin-u-0e17f2bd9074 svadmin-u-e7ee55ac7ffe svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{col.label}</th>
          {/each}
          <th scope="col" class="svadmin-u-0e17f2bd9074 svadmin-u-e7ee55ac7ffe svadmin-u-706701550477 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('pivot.total')}</th>
        </tr>
      </thead>
      <tbody class="svadmin-u-fa6acbf81d74 svadmin-u-08b5607c7258 svadmin-u-0e65706bcccd">
        {#each pivot.rows as row (row.key)}
          <tr class="svadmin-u-c4b5eaba40e3 svadmin-u-ceb69a6b0e5f">
            <th scope="row" class="svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-2eba0d65d059 svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-967d113a1451 svadmin-u-79bf1259388b">{row.label}</th>
            {#each pivot.columns as col (col.key)}
              {@const val = pivot.cells.get(row.key)?.get(col.key)}
              <td class={cn('svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b', val === 0 ? 'svadmin-u-52183a1cca53' : 'svadmin-u-d4108abe6359')}>
                {#if canDrill && pivot.cells.get(row.key)?.has(col.key)}
                  <button type="button" class="svadmin-u-0e65706bcccd" onclick={() => drillDown(context, row.key, col.key)}
                    disabled={drillPending === context} aria-busy={drillPending === context}
                    aria-label={`${i18n.t('pivot.drilldown')}: ${row.label} / ${col.label}`}>
                    {display(val)}
                  </button>
                {:else}
                  {display(val)}
                {/if}
              </td>
            {/each}
            <td class="svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-967d113a1451">
              {display(pivot.rowTotals.get(row.key))}
            </td>
          </tr>
        {/each}
      </tbody>
      <tfoot class="svadmin-u-706701550477 svadmin-u-e83a7042bc91 svadmin-u-0e65706bcccd svadmin-u-bee68af349c9 svadmin-u-18049387f0af svadmin-u-d4108abe6359">
        <tr>
          <th scope="row" class="svadmin-u-0e17f2bd9074 svadmin-u-e7ee55ac7ffe svadmin-u-2eba0d65d059 svadmin-u-79bf1259388b">{i18n.t('pivot.grandTotal')}</th>
          {#each pivot.columns as col (col.key)}
            <td class="svadmin-u-0e17f2bd9074 svadmin-u-e7ee55ac7ffe">{display(pivot.columnTotals.get(col.key))}</td>
          {/each}
          <td class="svadmin-u-0e17f2bd9074 svadmin-u-e7ee55ac7ffe svadmin-u-20aaf08a7ed1">{display(pivot.grandTotal)}</td>
        </tr>
      </tfoot>
    </table>
  </div>
  {/if}
</div>
