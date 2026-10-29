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
    error?: string | undefined;
    onRetry?: () => void;
    onDrillDown?: (input: PivotDrilldown) => void | Promise<void>;
    ariaLabel?: string;
    class?: string;
    resource?: string;
    provider?: PivotProvider | undefined;
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

<div aria-busy={effectiveLoading} class={cn('rounded-xl border border-border bg-card p-4 shadow-xs text-xs space-y-3', className)}>
  <div class="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
    <div class="font-semibold text-foreground">
      {i18n.t('pivot.title')} <span class="text-muted-foreground font-normal">({rowLabel} × {columnLabel})</span>
    </div>
    <div class="text-muted-foreground">
      <strong class="text-primary">{i18n.t(`pivot.${aggregator}`)}</strong> ({valueLabel})
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
  <div class="overflow-x-auto rounded-lg border border-border/60" style="overflow-x: auto;">
    <table aria-label={ariaLabel ?? `${i18n.t('pivot.title')}: ${rowLabel} / ${columnLabel} / ${valueLabel}`} class="w-full text-right border-collapse">
      <thead class="bg-muted/40 font-semibold text-muted-foreground border-b border-border/60">
        <tr>
          <th scope="col" class="px-3 py-2.5 text-left bg-muted/60">{rowLabel} \ {columnLabel}</th>
          {#each pivot.columns as col (col.key)}
            <th scope="col" class="px-3 py-2.5 font-semibold text-foreground">{col.label}</th>
          {/each}
          <th scope="col" class="px-3 py-2.5 bg-muted/60 font-semibold text-foreground">{i18n.t('pivot.total')}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border/40 font-mono">
        {#each pivot.rows as row (row.key)}
          <tr class="hover:bg-muted/20 transition-colors">
            <th scope="row" class="px-3 py-2 text-left font-medium text-foreground bg-muted/20 font-sans">{row.label}</th>
            {#each pivot.columns as col (col.key)}
              {@const val = pivot.cells.get(row.key)?.get(col.key)}
              <td class={cn('px-3 py-2', val === 0 ? 'text-muted-foreground/40' : 'text-foreground')}>
                {#if canDrill && pivot.cells.get(row.key)?.has(col.key)}
                  <button type="button" class="font-mono" onclick={() => drillDown(context, row.key, col.key)}
                    disabled={drillPending === context} aria-busy={drillPending === context}
                    aria-label={`${i18n.t('pivot.drilldown')}: ${row.label} / ${col.label}`}>
                    {display(val)}
                  </button>
                {:else}
                  {display(val)}
                {/if}
              </td>
            {/each}
            <td class="px-3 py-2 font-semibold text-foreground bg-muted/20">
              {display(pivot.rowTotals.get(row.key))}
            </td>
          </tr>
        {/each}
      </tbody>
      <tfoot class="bg-muted/60 font-semibold font-mono border-t-2 border-border text-foreground">
        <tr>
          <th scope="row" class="px-3 py-2.5 text-left font-sans">{i18n.t('pivot.grandTotal')}</th>
          {#each pivot.columns as col (col.key)}
            <td class="px-3 py-2.5">{display(pivot.columnTotals.get(col.key))}</td>
          {/each}
          <td class="px-3 py-2.5 text-primary">{display(pivot.grandTotal)}</td>
        </tr>
      </tfoot>
    </table>
  </div>
  {/if}
</div>
