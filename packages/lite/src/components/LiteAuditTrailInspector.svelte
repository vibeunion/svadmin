<script lang="ts">
  export interface AuditEventItem {
    id: string;
    timestamp: string;
    actor: { name: string; ip?: string; role?: string };
    action: string;
    actionLabel: string;
    resource: string;
    severity?: 'info' | 'warning' | 'critical';
    status: 'success' | 'failure' | 'blocked';
    traceId?: string;
  }

  interface Props {
    events?: AuditEventItem[];
    title?: string;
    class?: string;
  }

  let {
    events = [
      {
        id: 'evt-aud-1091',
        timestamp: '2026-11-12 10:24:18',
        actor: { name: '李思远 (运营主管)', ip: '192.168.10.42', role: 'SecOps Auditor' },
        action: 'tenant_switch',
        actionLabel: '切换工作区租户',
        resource: 'TenantContext',
        severity: 'info',
        status: 'success',
        traceId: 'trc-9821-fa44-a1',
      },
      {
        id: 'evt-aud-1090',
        timestamp: '2026-11-12 09:58:30',
        actor: { name: '赵宏 (财务总监)', ip: '10.8.0.12', role: 'Finance Admin' },
        action: 'permission_grant',
        actionLabel: '跨组织提权审批',
        resource: 'RolePermission',
        severity: 'critical',
        status: 'success',
        traceId: 'trc-8820-cb91-e4',
      },
    ],
    title = '全局操作审计追踪中心 (SSR 降级表格)',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-audit-inspector {className}"
  data-svadmin-component="LiteAuditTrailInspector"
  role="region"
  aria-label="Audit Trail Inspector"
>
  <header class="lite-audit-header">
    <div class="lite-audit-title-row">
      <span class="lite-shield-icon">🛡️</span>
      <h4 class="lite-audit-title">{title}</h4>
    </div>
    <span class="lite-audit-count">共 {events.length} 条审计日志</span>
  </header>

  <div class="lite-audit-table-wrap">
    <table class="lite-audit-table">
      <thead>
        <tr>
          <th>时间</th>
          <th>操作人</th>
          <th>动作与资源</th>
          <th>级别</th>
          <th>执行状态</th>
          <th>追踪链路</th>
        </tr>
      </thead>
      <tbody>
        {#each events as evt (evt.id)}
          <tr>
            <td class="font-mono">{evt.timestamp}</td>
            <td>
              <span class="lite-actor-name">{evt.actor.name}</span>
              {#if evt.actor.ip}<span class="lite-actor-ip font-mono">({evt.actor.ip})</span>{/if}
            </td>
            <td>
              <span class="lite-action-label">{evt.actionLabel}</span>
              <span class="lite-target-res">[{evt.resource}]</span>
            </td>
            <td>
              <span
                class="lite-sev-badge"
                class:lite-sev-critical={evt.severity === 'critical'}
                class:lite-sev-warning={evt.severity === 'warning'}
                class:lite-sev-info={evt.severity === 'info'}
              >
                {evt.severity ?? 'info'}
              </span>
            </td>
            <td>
              <span
                class="lite-status-badge"
                class:lite-status-blocked={evt.status === 'blocked'}
                class:lite-status-success={evt.status === 'success'}
              >
                {evt.status}
              </span>
            </td>
            <td class="font-mono text-muted">{evt.traceId ?? '-'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .lite-audit-inspector {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-audit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-audit-title-row { display: flex; align-items: center; }
  .lite-shield-icon { font-size: 14px; margin-right: 6px; }
  .lite-audit-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-audit-count { font-size: 11px; color: #86909c; }
  .lite-audit-table-wrap { overflow-x: auto; }
  .lite-audit-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    text-align: left;
  }
  .lite-audit-table th, .lite-audit-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #f2f3f5;
  }
  .lite-audit-table th { background: #fafafa; font-weight: 600; color: #4e5969; font-size: 11px; }
  .font-mono { font-family: monospace; font-size: 11px; }
  .text-muted { color: #86909c; }
  .lite-actor-name { font-weight: 500; color: #1d2129; }
  .lite-actor-ip { font-size: 10px; color: #86909c; margin-left: 4px; }
  .lite-action-label { font-weight: 500; color: #165dff; }
  .lite-target-res { font-size: 10px; color: #86909c; margin-left: 4px; }
  .lite-sev-badge {
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 2px;
    text-transform: uppercase;
    font-weight: 600;
  }
  .lite-sev-critical { background: #ffece8; color: #f53f3f; }
  .lite-sev-warning { background: #fff7e8; color: #ff7d00; }
  .lite-sev-info { background: #e8f3ff; color: #165dff; }
  .lite-status-badge { font-size: 11px; font-weight: 500; }
  .lite-status-success { color: #00b42a; }
  .lite-status-blocked { color: #f53f3f; font-weight: 600; }
</style>
