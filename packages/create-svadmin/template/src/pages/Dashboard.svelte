<script lang="ts">
  import { useList } from '@svadmin/core';
  import { posts, users, comments } from '../resource-contracts';
  import { Button, DataState, MetricBlock } from '@svadmin/ui';

  const postsQuery = useList({ resource: posts, pagination: { current: 1, pageSize: 1 } });
  const usersQuery = useList({ resource: users, pagination: { current: 1, pageSize: 1 } });
  const commentsQuery = useList({ resource: comments, pagination: { current: 1, pageSize: 1 } });

  const stats = $derived([
    { label: 'Total Posts', query: postsQuery },
    { label: 'Total Users', query: usersQuery },
    { label: 'Total Comments', query: commentsQuery },
  ]);

  const hasMetricError = $derived(stats.some(stat => stat.query.isError));

  const recentPosts = useList({ resource: posts, pagination: { current: 1, pageSize: 5 } });
  const recentUsers = useList({ resource: users, pagination: { current: 1, pageSize: 5 } });
</script>

<div class="space-y-4">
  <h1 class="text-xl font-semibold text-foreground">Dashboard</h1>

  {#if hasMetricError}
    <DataState state="error" title="Some totals are unavailable" retry={() => {
      for (const stat of stats) if (stat.query.isError && !stat.query.isFetching) void stat.query.refetch();
    }} />
  {/if}
  <div class="grid gap-4 sm:grid-cols-3">
    {#each stats as stat (stat.label)}
      <MetricBlock label={stat.label} value={stat.query.isError ? '—' : stat.query.data?.total ?? '—'} loading={stat.query.isLoading} />
    {/each}
  </div>

  <!-- Recent Data -->
  <div class="grid gap-6 lg:grid-cols-2">
    <section class="min-w-0">
      <div class="flex items-center justify-between border-b py-3">
        <h2 class="font-semibold text-foreground">Recent Posts</h2>
        <a href="#/posts" class="text-sm text-primary hover:underline">View all</a>
      </div>
      {#if recentPosts.isLoading}
        <DataState state="loading" />
      {:else if recentPosts.isError}
        <DataState state="error" retry={() => { if (!recentPosts.isFetching) void recentPosts.refetch(); }} />
      {:else}
      <div class="divide-y">
        {#each recentPosts.data?.data ?? [] as post, _i (_i)}
          <div class="flex items-center justify-between py-3">
            <div class="min-w-0">
              <p class="break-words text-sm font-medium text-foreground">{post.title}</p>
              <p class="text-xs text-muted-foreground">User #{post.userId}</p>
            </div>
          </div>
        {:else}
          <DataState state="empty">
            {#snippet action()}<Button href="#/posts/create">Create post</Button>{/snippet}
          </DataState>
        {/each}
      </div>
      {/if}
    </section>

    <section class="min-w-0">
      <div class="flex items-center justify-between border-b py-3">
        <h2 class="font-semibold text-foreground">Users</h2>
        <a href="#/users" class="text-sm text-primary hover:underline">View all</a>
      </div>
      {#if recentUsers.isLoading}
        <DataState state="loading" />
      {:else if recentUsers.isError}
        <DataState state="error" retry={() => { if (!recentUsers.isFetching) void recentUsers.refetch(); }} />
      {:else}
      <div class="divide-y">
        {#each recentUsers.data?.data ?? [] as user, _i (_i)}
          <div class="flex items-center justify-between py-3">
            <div class="min-w-0">
              <p class="break-words text-sm font-medium text-foreground">{user.name}</p>
              <p class="break-words text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        {:else}
          <DataState state="empty">
            {#snippet action()}<Button href="#/users/create">Create user</Button>{/snippet}
          </DataState>
        {/each}
      </div>
      {/if}
    </section>
  </div>
</div>
