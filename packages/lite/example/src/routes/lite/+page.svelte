<script lang="ts">
  import {
    LiteAlert,
    LiteSearch,
    LiteTable,
    LitePagination,
    LiteStatsCard,
  } from '@svadmin/lite';
  import { postsResource } from '$lib/admin';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
</script>

<div class="lite-page">
  <div class="lite-page-header">
    <h1 class="lite-page-title">Operations Dashboard</h1>
  </div>

  {#if form?.success}
    <LiteAlert type="success" message="Operation completed successfully" />
  {:else if form?.error}
    <LiteAlert type="error" message={String(form.error)} />
  {/if}

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
    <LiteStatsCard label="Total Resources" value={data.stats.resourcesCount} trendValue="+52 dynamic" trend="neutral" />
    <LiteStatsCard label="Products" value={data.stats.productsTotal} trendValue="Live in-memory" trend="up" />
    <LiteStatsCard label="Users" value={data.stats.usersTotal} trendValue="RBAC enabled" trend="up" />
    <LiteStatsCard label="Sales Orders" value={data.stats.ordersTotal} trendValue="Active orders" trend="neutral" />
  </div>

  <div class="lite-card" style="margin-bottom: 24px;">
    <div style="padding: 16px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">Quick SSR Posts Test</h2>
        <p style="font-size: 12px; color: #64748b; margin: 0;">Verified zero-JS CRUD table for IE11 SSR contract</p>
      </div>
      <a href="/lite/posts/create" class="lite-btn lite-btn-primary lite-btn-sm">+ Create Post</a>
    </div>

    <div style="padding: 16px 16px 0 16px;">
      <LiteSearch value={data.currentSearch} placeholder="Search posts..." />
    </div>

    <LiteTable
      records={data.records}
      resource={postsResource}
      currentSearch={data.currentSearch}
      currentSort={data.currentSort}
      currentOrder={data.currentOrder}
      basePath="/lite"
      canShow={false}
      canEdit={false}
    />

    {#if data.total > data.pageSize}
      <LitePagination
        page={data.page}
        totalPages={data.totalPages}
        preserveParams={{
          ...(data.currentSort ? { sort: data.currentSort } : {}),
          ...(data.currentOrder ? { order: data.currentOrder } : {}),
          ...(data.currentSearch ? { q: data.currentSearch } : {}),
        }}
      />
    {/if}
  </div>
</div>
