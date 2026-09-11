<script lang="ts">
  import { useList } from '@svadmin/core';
  import { posts, users, comments } from '../resource-contracts';
  import { FileText, Users, MessageCircle, Loader2 } from '@lucide/svelte';

  const postsQuery = useList({ resource: posts, pagination: { current: 1, pageSize: 1 } });
  const usersQuery = useList({ resource: users, pagination: { current: 1, pageSize: 1 } });
  const commentsQuery = useList({ resource: comments, pagination: { current: 1, pageSize: 1 } });

  const stats = $derived([
    { label: 'Total Posts', value: postsQuery.data?.total ?? '—', Icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Users', value: usersQuery.data?.total ?? '—', Icon: Users, color: 'bg-green-50 text-green-600' },
    { label: 'Total Comments', value: commentsQuery.data?.total ?? '—', Icon: MessageCircle, color: 'bg-purple-50 text-purple-600' },
  ]);

  const isLoading = $derived(postsQuery.isLoading || usersQuery.isLoading || commentsQuery.isLoading);

  const recentPosts = useList({ resource: posts, pagination: { current: 1, pageSize: 5 } });
  const recentUsers = useList({ resource: users, pagination: { current: 1, pageSize: 5 } });
</script>

<div class="space-y-6">
  <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>

  <!-- Stats -->
  <div class="grid gap-4 sm:grid-cols-3">
    {#each stats as stat, _i (_i)}
      <div class="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl {stat.color}">
          <stat.Icon class="h-6 w-6" />
        </div>
        <div>
          <p class="text-sm text-gray-500">{stat.label}</p>
          {#if isLoading}
            <Loader2 class="mt-1 h-5 w-5 animate-spin text-gray-300" />
          {:else}
            <p class="text-2xl font-bold text-gray-900">{stat.value}</p>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Recent Data -->
  <div class="grid gap-6 lg:grid-cols-2">
    <div class="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h2 class="font-semibold text-gray-900">Recent Posts</h2>
        <a href="#/posts" class="text-sm text-primary hover:underline">View all</a>
      </div>
      <div class="divide-y divide-gray-50">
        {#each recentPosts.data?.data ?? [] as post, _i (_i)}
          <div class="flex items-center justify-between px-5 py-3">
            <div>
              <p class="text-sm font-medium text-gray-900">{post.title}</p>
              <p class="text-xs text-gray-500">User #{post.userId}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h2 class="font-semibold text-gray-900">Users</h2>
        <a href="#/users" class="text-sm text-primary hover:underline">View all</a>
      </div>
      <div class="divide-y divide-gray-50">
        {#each recentUsers.data?.data ?? [] as user, _i (_i)}
          <div class="flex items-center justify-between px-5 py-3">
            <div>
              <p class="text-sm font-medium text-gray-900">{user.name}</p>
              <p class="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
