<script lang="ts">
  import { useList } from '@svadmin/core';
  import { posts, users, comments } from '../resource-contracts';
  import { AutoTable, Button, DashboardPage, DataState, MetricBlock, PageSection } from '@svadmin/ui';

  const postsQuery = useList({ resource: posts, pagination: { current: 1, pageSize: 1 } });
  const usersQuery = useList({ resource: users, pagination: { current: 1, pageSize: 1 } });
  const commentsQuery = useList({ resource: comments, pagination: { current: 1, pageSize: 1 } });

  const stats = $derived([
    { label: 'Total Posts', query: postsQuery },
    { label: 'Total Users', query: usersQuery },
    { label: 'Total Comments', query: commentsQuery },
  ]);

  const hasMetricError = $derived(stats.some(stat => stat.query.isError));

</script>

<DashboardPage title="Dashboard">
  {#if hasMetricError}
    <DataState state="error" title="Some totals are unavailable" retry={() => {
      for (const stat of stats) if (stat.query.isError && !stat.query.isFetching) void stat.query.refetch();
    }} />
  {/if}
  {#snippet metrics()}
    {#each stats as stat (stat.label)}
      <MetricBlock label={stat.label} value={stat.query.isError ? '—' : stat.query.data?.total ?? '—'} loading={stat.query.isLoading} />
    {/each}
  {/snippet}

  <PageSection title="Posts">
    {#snippet actions()}<Button variant="ghost" href="#/posts">View all</Button>{/snippet}
    <AutoTable resourceName="posts" showHeader={false} selectable={false} syncWithLocation={false} />
  </PageSection>
  {#snippet secondary()}
    <PageSection title="Users">
      {#snippet actions()}<Button variant="ghost" href="#/users">View all</Button>{/snippet}
      <AutoTable resourceName="users" showHeader={false} selectable={false} syncWithLocation={false} />
    </PageSection>
  {/snippet}
</DashboardPage>
