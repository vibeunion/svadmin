<script lang="ts">
  import {
    LiteAlert,
    LiteSearch,
    LiteTable,
    LitePagination,
    LiteMetricStrip,
    LiteBadge,
    LiteBarChart,
    getStatusBadgeClass,
  } from "@svadmin/lite";
  import { postsResource } from "#lib/admin";
  import type { PageProps } from "./$types";
  import { definedOptions } from '@svadmin/core/options';

  let { data, form }: PageProps = $props();

  const revenueChartData = $derived(data.recentOrders.map(order => ({
    label: order.orderNumber,
    value: order.totalAmount,
  })));
</script>

<div class="lite-page">
  <div class="lite-page-header">
    <div>
      <h1 class="lite-page-title">Operations & Analytics Dashboard</h1>
      <p class="lite-card-subtitle">
        <LiteBadge variant="info">Lite SSR</LiteBadge>
        Zero JavaScript • High Performance Server Rendering • Native HTML Forms
      </p>
    </div>
    <a href="/lite/compatibility" class="lite-btn lite-btn-sm">Compatibility matrix</a>
  </div>

  {#if form?.success}
    <LiteAlert type="success" message="Operation completed successfully" />
  {:else if form?.error}
    <LiteAlert type="error" message={String(form.error)} />
  {/if}

  <!-- KPI metrics -->
  <LiteMetricStrip
    ariaLabel="Operations metrics"
    columns={4}
    items={[
      {
        label: `Revenue from ${data.stats.sampledOrders} latest orders`,
        value: "$" + Number(data.stats.sampleRevenue).toLocaleString(),
        tone: "primary",
      },
      {
        label: "Active Products",
        value: data.stats.productsTotal,
        tone: "success",
        badge: { text: "In inventory", tone: "success" },
      },
      {
        label: "Sales Orders",
        value: data.stats.ordersTotal,
      },
      {
        label: "Connected Resources",
        value: data.stats.resourcesCount,
        tone: "info",
        href: "/lite/parity",
      },
    ]}
  />
  <!-- Analytics & Breakdown Section -->
  <div class="lite-dashboard-split">
    <LiteBarChart
      title="Recent order amounts ($)"
      data={revenueChartData}
    />

    <div class="lite-card lite-card-flush">
      <div class="lite-card-header">
        <h2 class="lite-card-title">Operational Health</h2>
      </div>
      <div class="lite-card-body">
        <ul class="lite-kv-list">
          <li class="lite-kv-row">
            <span class="lite-kv-label">Registered Users</span>
            <span class="lite-kv-value">{data.stats.usersTotal}</span>
          </li>
          <li class="lite-kv-row">
            <span class="lite-kv-label">Suppliers</span>
            <span class="lite-kv-value">{data.stats.suppliersTotal}</span>
          </li>
          <li class="lite-kv-row">
            <span class="lite-kv-label">Active Warehouses</span>
            <span class="lite-kv-value">{data.stats.warehousesTotal}</span>
          </li>
          <li class="lite-kv-row">
            <span class="lite-kv-label">Revenue sample / all orders</span>
            <span class="lite-kv-value">{data.stats.sampledOrders} / {data.stats.ordersTotal}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Recent Sales Orders Table -->
  <div class="lite-card lite-card-flush" style="margin-bottom: 24px;">
    <div class="lite-card-header">
      <div>
        <h2 class="lite-card-title">Recent Sales Orders</h2>
        <p class="lite-card-subtitle">Live transactional data from operations pipeline</p>
      </div>
      <a href="/lite/sales_orders" class="lite-btn lite-btn-sm lite-card-action">View All Orders &rarr;</a>
    </div>

    <div class="lite-table-scroll" role="region" aria-label="Recent sales orders">
      <table class="lite-table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th style="text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody>
          {#each data.recentOrders as order (order.id)}
            <tr>
              <td><strong>{order.orderNumber}</strong></td>
              <td>{order.customerName}</td>
              <td>{order.orderDate}</td>
              <td><strong>{"$" + order.totalAmount}</strong></td>
              <td>
                <span class={getStatusBadgeClass(order.status)}>
                  {String(order.status).toUpperCase()}
                </span>
              </td>
              <td style="text-align: right;">
                <a href={"/lite/sales_orders/show/" + order.id} class="lite-btn lite-btn-sm">Show</a>
                <a href={"/lite/sales_orders/edit/" + order.id} class="lite-btn lite-btn-sm">Edit</a>
              </td>
            </tr>
          {:else}
            <tr><td colspan="6">No sales orders found. <a href="/lite/sales_orders/create">Create sales order</a></td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Quick Domain Navigation Cards -->
  <div class="lite-card lite-card-flush" style="margin-bottom: 24px;">
    <div class="lite-card-header">
      <div>
        <h2 class="lite-card-title">Domain Resource Modules</h2>
        <p class="lite-card-subtitle">Instant CRUD access across all business domains</p>
      </div>
    </div>
    <div class="lite-resource-links">
      <a href="/lite/products" class="lite-resource-card">
        <strong class="lite-resource-card-title">📦 Products</strong>
        <span class="lite-resource-card-desc">Manage catalog & inventory</span>
      </a>
      <a href="/lite/sales_orders" class="lite-resource-card">
        <strong class="lite-resource-card-title">📑 Sales Orders</strong>
        <span class="lite-resource-card-desc">Fulfill customer requests</span>
      </a>
      <a href="/lite/users" class="lite-resource-card">
        <strong class="lite-resource-card-title">👥 Users & Roles</strong>
        <span class="lite-resource-card-desc">RBAC security & accounts</span>
      </a>
      <a href="/lite/crm_accounts" class="lite-resource-card">
        <strong class="lite-resource-card-title">💼 CRM Accounts</strong>
        <span class="lite-resource-card-desc">Enterprise clients & contacts</span>
      </a>
      <a href="/lite/stock_movements" class="lite-resource-card">
        <strong class="lite-resource-card-title">🚚 Logistics</strong>
        <span class="lite-resource-card-desc">Stock transfers & movements</span>
      </a>
    </div>
  </div>

  <!-- IE11 SSR Verification Posts Table -->
  <div class="lite-card lite-card-flush" style="margin-bottom: 24px;">
    <div class="lite-card-header">
      <div>
        <h2 class="lite-card-title">Quick SSR Posts Test</h2>
        <p class="lite-card-subtitle">Verified zero-JS CRUD table for IE11 SSR contract</p>
      </div>
      <a href="/lite/posts/create" class="lite-btn lite-btn-primary lite-btn-sm lite-card-action">+ Create Post</a>
    </div>

    <div class="lite-card-body" style="padding-bottom: 0;">
      <LiteSearch {...definedOptions({ value: data.currentSearch })} placeholder="Search posts..." />
    </div>

    <div class="lite-table-scroll">
      <LiteTable
        records={data.records}
        resource={postsResource}
        {...definedOptions({ currentSearch: data.currentSearch, currentSort: data.currentSort, currentOrder: data.currentOrder })}
        basePath="/lite"
        canShow={false}
        canEdit={false}
        stickyColumns={{ left: "id" }}
        stickyActions
      />
    </div>

    {#if data.total > data.pageSize}
      <div class="lite-card-body">
        <LitePagination
          page={data.page}
          totalPages={data.totalPages}
          preserveParams={{
            ...(data.currentSort ? { sort: data.currentSort } : {}),
            ...(data.currentOrder ? { order: data.currentOrder } : {}),
            ...(data.currentSearch ? { q: data.currentSearch } : {}),
          }}
        />
      </div>
    {/if}
  </div>
</div>
