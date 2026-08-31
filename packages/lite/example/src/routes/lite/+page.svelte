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
  import { postsResource } from "$lib/admin";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  const revenueChartData = [
    { label: "Hardware & Laptops", value: 6495, color: "#4f46e5" },
    { label: "Office Accessories", value: 499, color: "#06b6d4" },
    { label: "Maintenance & Support", value: 1250, color: "#10b981" },
    { label: "Direct Services", value: 820, color: "#f59e0b" },
  ];
</script>

<div class="lite-page">
  <div class="lite-page-header">
    <div>
      <h1 class="lite-page-title">Operations & Analytics Dashboard</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">
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
        label: "Total Revenue",
        value: "$" + Number(data.stats.totalRevenue).toLocaleString(),
        tone: "primary",
        trend: { value: 14.2, label: "MoM" },
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
        trend: { value: 0, label: "fulfillment" },
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
      title="Revenue Distribution by Category ($)"
      data={revenueChartData}
    />

    <div class="lite-card" style="margin-bottom: 16px;">
      <div style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 14px; color: #0f172a;">
        Operational Health
      </div>
      <div style="padding: 16px;" class="lite-stack-sm">
        <div style="display: flex; justify-content: space-between; font-size: 13px;">
          <span style="color: #64748b;">Registered Users</span>
          <span style="font-weight: 600;">{data.stats.usersTotal}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px;">
          <span style="color: #64748b;">Suppliers</span>
          <span style="font-weight: 600;">{data.stats.suppliersTotal}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px;">
          <span style="color: #64748b;">Active Warehouses</span>
          <span style="font-weight: 600;">{data.stats.warehousesTotal}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; padding-top: 8px; border-top: 1px solid #f1f5f9;">
          <span style="color: #64748b;">SSR Rendering Latency</span>
          <span class="lite-badge lite-badge-success">&lt; 5ms</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Recent Sales Orders Table -->
  <div class="lite-card" style="margin-bottom: 24px;">
    <div style="padding: 16px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">Recent Sales Orders</h2>
        <p style="font-size: 12px; color: #64748b; margin: 0;">Live transactional data from operations pipeline</p>
      </div>
      <a href="/lite/sales_orders" class="lite-btn lite-btn-sm">View All Orders &rarr;</a>
    </div>

    <table class="lite-table" style="border: none; border-radius: 0;">
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
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Quick Domain Navigation Cards -->
  <div class="lite-card" style="margin-bottom: 24px;">
    <div style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
      <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">Domain Resource Modules</h2>
      <p style="font-size: 12px; color: #64748b; margin: 0;">Instant CRUD access across all business domains</p>
    </div>
    <div class="lite-resource-links">
      <a href="/lite/products" class="lite-btn" style="text-align: left; padding: 12px;">
        <strong style="display: block; font-size: 14px; margin-bottom: 2px;">📦 Products</strong>
        <span style="font-size: 12px; color: #64748b;">Manage catalog & inventory</span>
      </a>
      <a href="/lite/sales_orders" class="lite-btn" style="text-align: left; padding: 12px;">
        <strong style="display: block; font-size: 14px; margin-bottom: 2px;">📑 Sales Orders</strong>
        <span style="font-size: 12px; color: #64748b;">Fulfill customer requests</span>
      </a>
      <a href="/lite/users" class="lite-btn" style="text-align: left; padding: 12px;">
        <strong style="display: block; font-size: 14px; margin-bottom: 2px;">👥 Users & Roles</strong>
        <span style="font-size: 12px; color: #64748b;">RBAC security & accounts</span>
      </a>
      <a href="/lite/crm_accounts" class="lite-btn" style="text-align: left; padding: 12px;">
        <strong style="display: block; font-size: 14px; margin-bottom: 2px;">💼 CRM Accounts</strong>
        <span style="font-size: 12px; color: #64748b;">Enterprise clients & contacts</span>
      </a>
      <a href="/lite/stock_movements" class="lite-btn" style="text-align: left; padding: 12px;">
        <strong style="display: block; font-size: 14px; margin-bottom: 2px;">🚚 Logistics</strong>
        <span style="font-size: 12px; color: #64748b;">Stock transfers & movements</span>
      </a>
    </div>
  </div>

  <!-- IE11 SSR Verification Posts Table -->
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

    <div class="lite-table-scroll">
      <LiteTable
        records={data.records}
        resource={postsResource}
        currentSearch={data.currentSearch}
        currentSort={data.currentSort}
        currentOrder={data.currentOrder}
        basePath="/lite"
        canShow={false}
        canEdit={false}
        stickyColumns={{ left: "id" }}
        stickyActions
      />
    </div>

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
