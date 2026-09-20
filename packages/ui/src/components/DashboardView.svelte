<script lang="ts">
  import { Loader2, RefreshCw } from '@lucide/svelte';
  import {
    DashboardContractError, captureAdminContext, captureAuthSession, createEnterpriseRequestContext,
    decodeDashboardQuery, decodeDashboardSnapshot,
  } from '@svadmin/core';
  import type { DashboardProvider, DashboardSnapshot, EnterpriseProviderRequestContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { onDestroy, untrack } from 'svelte';
  import MetricStrip, { type MetricStripItem } from './MetricStrip.svelte';
  import { Button } from './ui/button/index.js';

  interface Props {
    provider: DashboardProvider;
    dashboardId: string;
    requestContext?: EnterpriseProviderRequestContext;
    filters?: readonly { field: string; value: string | number | boolean | null }[];
    title?: string;
  }
  let { provider, dashboardId, requestContext, filters = [], title }: Props = $props();
  const context = captureAdminContext();
  const i18n = useTranslation();
  let snapshot = $state<DashboardSnapshot>();
  let loading = $state(false);
  let error = $state<'load' | 'invalid'>();
  let epoch = 0;
  let mounted = true;
  let generatedContext: EnterpriseProviderRequestContext | undefined;
  onDestroy(() => { mounted = false; });

  function resolveContext(): EnterpriseProviderRequestContext {
    if (requestContext) return requestContext;
    const tenant = context.tenantCacheKey?.__svadminTenant;
    if (typeof tenant !== 'string' && typeof tenant !== 'number') throw new Error('Missing tenant context');
    if (generatedContext?.tenantId === tenant) return generatedContext;
    generatedContext = createEnterpriseRequestContext({ tenantId: tenant });
    return generatedContext;
  }

  async function load(): Promise<void> {
    const currentEpoch = ++epoch;
    loading = true;
    error = undefined;
    try {
      const request = decodeDashboardQuery({
        dashboardId: dashboardId.trim(),
        ...(filters.length ? { filters: filters.map(filter => ({ ...filter })) } : {}),
      });
      const result = decodeDashboardSnapshot(await provider.get(resolveContext(), request));
      if (!mounted || currentEpoch !== epoch) return;
      snapshot = result;
    } catch (cause) {
      if (!mounted || currentEpoch !== epoch) return;
      snapshot = undefined;
      error = cause instanceof DashboardContractError ? 'invalid' : 'load';
    } finally {
      if (mounted && currentEpoch === epoch) loading = false;
    }
  }

  const metricItems = $derived<MetricStripItem[]>(snapshot?.widgets.flatMap(widget =>
    widget.kind === 'metric' ? widget.metrics.map(metric => ({
      id: `${widget.id}:${metric.id}`, label: metric.label,
      value: typeof metric.value === 'boolean' ? String(metric.value) : metric.value ?? '—',
      ...(metric.tone ? { tone: metric.tone } : {}),
      ...(metric.href ? { href: metric.href } : {}),
    })) : [],
  ) ?? []);

  $effect(() => {
    void provider; void dashboardId; void requestContext; void filters;
    void captureAuthSession(context.authProvider).cacheKey;
    untrack(() => { snapshot = undefined; void load(); });
  });
</script>

<section class="svadmin-dashboard-view" aria-label={title ?? i18n.t('dashboard.title')}>
  <header class="svadmin-dashboard-view__header">
    <h2>{title ?? i18n.t('dashboard.title')}</h2>
    <Button type="button" variant="outline" size="sm" aria-label={i18n.t('common.refresh')} onclick={() => void load()}>
      <RefreshCw aria-hidden="true" class={loading ? 'svadmin-dashboard-view__spin' : undefined} />
    </Button>
  </header>
  {#if loading}<div role="status"><Loader2 aria-hidden="true" /> {i18n.t('common.loading')}</div>
  {:else if error}<div role="alert">{i18n.t(`dashboard.${error}`)}</div>
  {:else if snapshot}
    {#each snapshot.widgets.filter(widget => widget.kind === 'text') as widget (widget.id)}
      <section aria-labelledby={`dashboard-widget-${widget.id}`}><h3 id={`dashboard-widget-${widget.id}`}>{widget.title}</h3><p>{widget.text}</p></section>
    {/each}
    <MetricStrip items={metricItems} ariaLabel={title ?? i18n.t('dashboard.metrics')} />
  {:else}<div role="status">{i18n.t('dashboard.empty')}</div>{/if}
</section>

<style>
  .svadmin-dashboard-view { display: grid; gap: 1rem; min-width: 0; }
  .svadmin-dashboard-view__header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  :global(.svadmin-dashboard-view__spin) { animation: svadmin-dashboard-spin 1s linear infinite; }
  @keyframes svadmin-dashboard-spin { to { transform: rotate(360deg); } }
</style>
