<script lang="ts">
  import { formatAdminTime } from '@svadmin/core';
  /**
   * LiteAuditLog — SSR-compatible audit log viewer.
   * Accepts both the legacy AuthProvider AuditLog shape and the current
   * core AuditEntry shape, including field-level diffs.
   */
  import type { AuditLog, AuditEntry } from '@svadmin/core';

  interface Props {
    logs?: AuditLog[];
    entries?: AuditEntry[];
    total?: number;
    page?: number;
    pageSize?: number;
    basePath?: string;
    title?: string;
  }

  let {
    logs = [],
    entries = [],
    total = 0,
    page = 1,
    pageSize = 20,
    basePath = '?',
    title = 'Audit Logs',
  }: Props = $props();

  interface DisplayEntry {
    id: string;
    timestamp: string | Date;
    user: string;
    action: string;
    resource: string;
    ip: string;
    changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  }

  function fieldChanges(entry: AuditEntry): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
    const previous = entry.previousData ?? {};
    const current = entry.data ?? {};
    const keys = new Set([...Object.keys(previous), ...Object.keys(current)]);
    return [...keys]
      .filter((key) => key !== 'id' && key !== 'updatedAt' && key !== 'updated_at')
      .filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(current[key]))
      .map((key) => ({ field: key, oldValue: previous[key], newValue: current[key] }));
  }

  function displayValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  const rows = $derived<DisplayEntry[]>(
    entries.length > 0
      ? entries.map((entry, index) => ({
          id: String(entry.id ?? index),
          timestamp: entry.timestamp,
          user: entry.userId ?? '—',
          action: entry.action,
          resource: `${entry.resource ?? '—'}${entry.recordId != null ? ` #${entry.recordId}` : ''}`,
          ip: entry.ipAddress ?? String(entry.meta?.['ip'] ?? '—'),
          changes: fieldChanges(entry),
        }))
      : logs.map((log) => ({
          id: String(log.id),
          timestamp: log.createdAt,
          user: log.userName ?? String(log.userId ?? '—'),
          action: log.action,
          resource: log.resource ?? '—',
          ip: log.ipAddress ?? '—',
          changes: [],
        })),
  );

  const effectiveTotal = $derived(total || rows.length);
  const totalPages = $derived(Math.max(1, Math.ceil(effectiveTotal / Math.max(1, pageSize))));

  function formatDate(value: string | Date) {
    return formatAdminTime(value, { dateStyle: 'medium' });
  }

  function actionClass(action: string): string {
    const normalized = action.toLowerCase();
    if (normalized.includes('delete') || normalized.includes('remove')) return 'lite-badge-danger';
    if (normalized.includes('create') || normalized.includes('add')) return 'lite-badge-success';
    if (normalized.includes('update') || normalized.includes('edit')) return 'lite-badge-warning';
    return 'lite-badge-default';
  }
</script>

<div class="lite-audit-log">
  <h2>{title}</h2>

  <table class="lite-table">
    <thead>
      <tr>
        <th style="width:160px;">Time</th>
        <th>User</th>
        <th>Action</th>
        <th>Resource</th>
        <th>Changes</th>
        <th style="width:120px;">IP Address</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.id)}
        <tr data-audit-entry={row.id}>
          <td style="font-family:monospace;font-size:12px;color:#4E5969;">{formatDate(row.timestamp)}</td>
          <td>{row.user}</td>
          <td><span class="lite-badge {actionClass(row.action)}">{row.action}</span></td>
          <td style="color:#4E5969;">{row.resource}</td>
          <td>
            {#if row.changes.length > 0}
              <ul class="lite-audit-diff">
                {#each row.changes as change (change.field)}
                  <li>
                    <strong>{change.field}</strong>
                    <span class="lite-audit-old">{displayValue(change.oldValue)}</span>
                    <span aria-hidden="true">→</span>
                    <span class="lite-audit-new">{displayValue(change.newValue)}</span>
                  </li>
                {/each}
              </ul>
            {:else}
              <span style="color:#86909C;">—</span>
            {/if}
          </td>
          <td style="font-family:monospace;font-size:12px;color:#4E5969;">{row.ip}</td>
        </tr>
      {:else}
        <tr>
          <td colspan="6" style="text-align:center;padding:24px;color:#86909C;">No audit logs found.</td>
        </tr>
      {/each}
    </tbody>
  </table>

  {#if totalPages > 1}
    <div class="lite-pagination" style="margin-top:12px;">
      {#if page > 1}
        <a href={`${basePath}page=${page - 1}`} class="lite-btn lite-btn-sm">&laquo; Prev</a>
      {/if}
      <span style="padding:0 12px;font-size:14px;color:#4E5969;">Page {page} / {totalPages} ({effectiveTotal} total)</span>
      {#if page < totalPages}
        <a href={`${basePath}page=${page + 1}`} class="lite-btn lite-btn-sm">Next &raquo;</a>
      {/if}
    </div>
  {/if}
</div>

<style>
  .lite-audit-log h2 { margin: 0 0 16px; color: #1d2129; font-size: 16px; }
  .lite-audit-diff { margin: 0; padding: 0; list-style: none; font-size: 11px; }
  .lite-audit-diff li { display: flex; flex-wrap: wrap; align-items: baseline; }
  .lite-audit-diff li + li { margin-top: 3px; }
  .lite-audit-diff strong { margin-right: 4px; color: #1d2129; }
  .lite-audit-old { margin-right: 4px; color: #f53f3f; text-decoration: line-through; }
  .lite-audit-new { color: #00b42a; }
</style>
