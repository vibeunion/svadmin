<script lang="ts">
  import * as Table from '../ui/table/index.js';
  import { useTranslation } from '@svadmin/core/i18n';
  import StatusBadge from './StatusBadge.svelte';
  import DataState from './DataState.svelte';
  import type { DataStateKind } from './DataState.svelte';
  export interface SecurityEvent { id: string; event: string; actor?: string; location?: string; createdAt: string; severity: 'info' | 'warning' | 'danger'; }
  interface Props { events?: SecurityEvent[]; state?: DataStateKind; stateTitle?: string; stateDescription?: string; emptyTitle?: string; emptyDescription?: string; retry?: () => void; retryLabel?: string; loadingLabel?: string; class?: string; }
  const i18n = useTranslation();
  let { events = [], state, stateTitle, stateDescription, emptyTitle, emptyDescription, retry, retryLabel, loadingLabel, class: className = '' }: Props = $props();
  const resolvedState = $derived(state ?? (events.length === 0 ? 'empty' : undefined));
  const isZh = $derived(i18n.locale === 'zh-CN');
</script>
{#if resolvedState}
  <DataState state={resolvedState} title={stateTitle ?? emptyTitle} description={stateDescription ?? emptyDescription} {retry} {retryLabel} {loadingLabel} class={className} />
{:else}
<div class={'overflow-x-auto rounded-lg border border-border bg-card ' + className}>
  <Table.Root data-svadmin-datatable>
    <Table.Header data-svadmin-table-head><Table.Row><Table.Head>{isZh ? '事件' : 'Event'}</Table.Head><Table.Head>{isZh ? '操作者' : 'Actor'}</Table.Head><Table.Head>{isZh ? '位置' : 'Location'}</Table.Head><Table.Head>{isZh ? '时间' : 'Time'}</Table.Head><Table.Head>{isZh ? '风险' : 'Risk'}</Table.Head></Table.Row></Table.Header>
    <Table.Body>
      {#each events as event (event.id)}
        <Table.Row data-svadmin-table-row><Table.Cell class="font-medium">{event.event}</Table.Cell><Table.Cell>{event.actor ?? (isZh ? '系统' : 'System')}</Table.Cell><Table.Cell>{event.location ?? (isZh ? '未知' : 'Unknown')}</Table.Cell><Table.Cell class="whitespace-nowrap">{event.createdAt}</Table.Cell><Table.Cell><StatusBadge status={event.severity} label={event.severity} /></Table.Cell></Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
</div>
{/if}
