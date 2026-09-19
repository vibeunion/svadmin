<script lang="ts">
  import { getContext } from 'svelte';
  import SvarDataGrid from '@svadmin/ui/components/SvarDataGrid.svelte';
  import type { SurfaceWidgetRendererProps } from '../catalog.js';
  import { SVAR_SURFACE_CONTEXT, type SvarSurfaceContext } from '../svar-context.js';
  import { decodeSvarGridProps } from '../svar-schema.js';
  import { asRecordArray } from '../widget-data.js';
  import { resolveSurfaceMessages } from '../localization.js';

  let { widgetId, props, data, locale = 'en-US', messages }: SurfaceWidgetRendererProps = $props();
  const host = getContext<SvarSurfaceContext | undefined>(SVAR_SURFACE_CONTEXT);
  const labels = $derived(resolveSurfaceMessages(locale, messages));
  const config = $derived(decodeSvarGridProps(props));
  const records = $derived(data.status === 'ready' ? asRecordArray(data.value) : undefined);
  const columns = $derived(config.columns.map(column => ({
    key: column.field, label: column.label,
    ...(column.width === undefined ? {} : { width: column.width }),
    ...(column.format === undefined ? {} : { format: column.format }),
  })));
  const Grid = $derived(host?.Grid);
  const Theme = $derived(host?.Theme);
</script>

<section aria-labelledby="svar-surface-{widgetId}" class="surface-data-grid">
  <h3 id="svar-surface-{widgetId}">{config.title}</h3>
  {#if !Grid || !Theme}
    <p role="alert">{locale.startsWith('zh') ? '宿主尚未配置 SVAR 引擎' : 'The host has not configured the SVAR engine'}</p>
  {:else if data.status === 'error'}
    <p role="alert">{data.error.message}</p>
  {:else if data.status === 'unbound' || (records && !records.ok)}
    <p role="alert">{labels.tableInvalidData}</p>
  {:else}
    <SvarDataGrid {Grid} {Theme} {columns} items={records?.ok ? records.value : []}
      primaryKey={config.rowKey ?? 'id'} height={config.height ?? 360} density={config.density ?? 'comfortable'}
      freezeLeft={config.freezeLeft ?? 0} freezeRight={config.freezeRight ?? 0}
      loading={data.status === 'loading'} label={config.title} {locale}
      scopeKey={`${host?.scopeKey ?? 0}:${widgetId}:${'sourceId' in data ? data.sourceId : ''}`}
      loadingLabel={labels.tableLoading} emptyLabel={config.emptyLabel ?? labels.tableNoRecords}
      selectable={false} />
  {/if}
</section>

<style>
  .surface-data-grid { min-width: 0; padding: 1rem; background: var(--card, Canvas); color: var(--foreground, CanvasText); border: 1px solid var(--border, GrayText); border-radius: var(--radius, 8px); }
  h3 { margin: 0 0 0.75rem; font-size: 1rem; }
  [role='alert'] { color: var(--destructive, CanvasText); }
</style>
