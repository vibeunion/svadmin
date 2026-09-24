<script lang="ts">
  import { useList, useCan } from '@svadmin/core';
  import { AutoTable, Button, DashboardPage, DataState, MetricBlock, PageSection } from '@svadmin/ui';
  import { customers, followups, approvals } from './contracts';
  import { getDesign } from '../../design.svelte';
  const design = $derived(getDesign());
  const access = useCan(() => ({ resource: 'customers', action: 'list' }));
  const followupAccess = useCan(() => ({ resource: 'followups', action: 'list' }));
  const approvalAccess = useCan(() => ({ resource: 'approvals', action: 'list' }));
  const customerQuery = useList(() => ({ resource: customers, pagination: { current: 1, pageSize: 1 }, queryOptions: { enabled: access.allowed } }));
  const followupQuery = useList(() => ({ resource: followups, pagination: { current: 1, pageSize: 1 }, queryOptions: { enabled: followupAccess.allowed } }));
  const pendingQuery = useList(() => ({
    resource: approvals, pagination: { current: 1, pageSize: 1 },
    filters: [{ field: 'status' as const, operator: 'eq' as const, value: 'pending' as const }],
    queryOptions: { enabled: approvalAccess.allowed },
  }));
  const stats = $derived([
    { label: '客户总数', query: customerQuery, access },
    { label: '跟进记录', query: followupQuery, access: followupAccess },
    { label: '待审批', query: pendingQuery, access: approvalAccess },
  ]);
</script>

<DashboardPage title="客户工作台">
  {#snippet actions()}<Button href="#/customers">查看客户</Button>{/snippet}
  {#snippet metrics()}
    {#each stats as stat (stat.label)}
      <MetricBlock label={stat.label}
        value={!stat.access.allowed || stat.query.isError ? '—' : stat.query.data?.total ?? '—'}
        loading={stat.access.isLoading || (stat.access.allowed && stat.query.isLoading)} />
    {/each}
  {/snippet}
  {#if stats.some(s => s.access.allowed && s.query.isError)}
    <DataState state="error" title="部分数据暂不可用" retry={() => {
      for (const stat of stats) if (stat.access.allowed && stat.query.isError) void stat.query.refetch();
    }} />
  {/if}
  <PageSection title="客户">
    <AutoTable resourceName="customers" showHeader={false} selectable={false}
      syncWithLocation={false} density={design.density} />
  </PageSection>
  {#snippet secondary()}
    <PageSection title="待办">
      <Button variant="ghost" href="#/approvals">处理审批</Button>
      <Button variant="ghost" href="#/followups/create">记录跟进</Button>
    </PageSection>
  {/snippet}
</DashboardPage>
