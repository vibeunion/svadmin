<script lang="ts">
  /**
   * LiteAuditLog — SSR-compatible audit log viewer.
   * Pure HTML table with pagination links. No client-side JS required.
   */
  import type { AuditLog } from '@svadmin/core';

  interface Props {
    logs: AuditLog[];
    total?: number;
    page?: number;
    pageSize?: number;
    basePath?: string;
  }

  let {
    logs,
    total = 0,
    page = 1,
    pageSize = 20,
    basePath = '?',
  }: Props = $props();

  const totalPages = $derived(Math.ceil(total / pageSize) || 1);

  function formatDate(auditTimestamp: string | Date) {
    return new Date(auditTimestamp).toLocaleString();
  }

  function actionClass(action: string): string {
    const normalizedAction = action.toLowerCase();
    if (normalizedAction.includes('delete') || normalizedAction.includes('remove')) return 'lite-badge-danger';
    if (normalizedAction.includes('create') || normalizedAction.includes('add')) return 'lite-badge-success';
    if (normalizedAction.includes('update') || normalizedAction.includes('edit')) return 'lite-badge-warning';
    return 'lite-badge-default';
  }
</script>

<div class="lite-audit-log">
  <h2 style="margin-bottom:16px;">Audit Logs</h2>
  
  <table class="lite-table">
    <thead>
      <tr>
        <th style="width:160px;">Time</th>
        <th>User</th>
        <th>Action</th>
        <th>Resource</th>
        <th style="width:120px;">IP Address</th>
      </tr>
    </thead>
    <tbody>
      {#each logs as log, _i (_i)}
        <tr>
          <td style="font-family:monospace;font-size:12px;color:#64748b;">{formatDate(log.createdAt)}</td>
          <td>{log.userName ?? '—'}</td>
          <td><span class="lite-badge {actionClass(log.action)}">{log.action}</span></td>
          <td style="color:#64748b;">{log.resource ?? '—'}</td>
          <td style="font-family:monospace;font-size:12px;color:#64748b;">{log.ipAddress ?? '—'}</td>
        </tr>
      {:else}
        <tr>
          <td colspan="5" style="text-align:center;padding:24px;color:#94a3b8;">No audit logs found.</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="lite-pagination" style="margin-top:12px;">
      {#if page > 1}
        <a href={`${basePath}page={page - 1}`} class="lite-btn lite-btn-sm">&laquo; Prev</a>
      {/if}
      <span style="padding:0 12px;font-size:14px;color:#64748b;">Page {page} / {totalPages} ({total} total)</span>
      {#if page < totalPages}
        <a href={`${basePath}page={page + 1}`} class="lite-btn lite-btn-sm">Next &raquo;</a>
      {/if}
    </div>
  {/if}
</div>

<style>
  .lite-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
  }
  .lite-badge-danger { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .lite-badge-success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
  .lite-badge-warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
  .lite-badge-default { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
</style>
