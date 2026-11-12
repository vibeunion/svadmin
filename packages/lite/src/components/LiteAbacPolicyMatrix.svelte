<script lang="ts">
  export interface AbacPolicyRule {
    id: string;
    name: string;
    resource: string;
    effect: 'allow' | 'mask' | 'require_mfa' | 'deny';
    priority: number;
    enabled: boolean;
  }

  interface Props {
    title?: string;
    rules?: AbacPolicyRule[];
    class?: string;
  }

  let {
    title = '企业级 ABAC 访问控制策略矩阵 (SSR 静态列表)',
    rules = [
      { id: 'r1', name: '财务大额调拨审批放行', resource: 'TreasuryPayment', effect: 'allow', priority: 100, enabled: true },
      { id: 'r2', name: '普通专员薪酬资产脱敏', resource: 'EmployeeCompensation', effect: 'mask', priority: 85, enabled: true },
      { id: 'r3', name: '非工作时段审计库阻断', resource: 'AuditArchiveStore', effect: 'deny', priority: 95, enabled: true },
      { id: 'r4', name: '大批量导出强制提权', resource: 'BatchDataExport', effect: 'require_mfa', priority: 90, enabled: true },
    ],
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-abac-matrix {className}"
  data-svadmin-component="LiteAbacPolicyMatrix"
  role="region"
  aria-label="ABAC Policy Matrix"
>
  <header class="lite-abac-header">
    <div class="lite-abac-title-row">
      <span class="lite-abac-icon">🛡️</span>
      <h4 class="lite-abac-title">{title}</h4>
    </div>
    <span class="lite-abac-count">共 {rules.length} 条策略规则</span>
  </header>

  <div class="lite-abac-table-wrap">
    <table class="lite-abac-table">
      <thead>
        <tr>
          <th>规则名称</th>
          <th>目标资源</th>
          <th>裁决效应</th>
          <th>优先级</th>
          <th>状态</th>
        </tr>
      </thead>
      <tbody>
        {#each rules as r (r.id)}
          <tr>
            <td class="lite-r-name">{r.name}</td>
            <td class="font-mono text-muted">{r.resource}</td>
            <td>
              <span
                class="lite-r-effect"
                class:lite-eff-allow={r.effect === 'allow'}
                class:lite-eff-mask={r.effect === 'mask'}
                class:lite-eff-mfa={r.effect === 'require_mfa'}
                class:lite-eff-deny={r.effect === 'deny'}
              >
                {r.effect}
              </span>
            </td>
            <td class="font-mono">{r.priority}</td>
            <td>
              <span class="lite-status-txt">{r.enabled ? '已启用' : '已停用'}</span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .lite-abac-matrix {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-abac-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-abac-title-row { display: flex; align-items: center; }
  .lite-abac-icon { font-size: 14px; margin-right: 6px; }
  .lite-abac-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-abac-count { font-size: 11px; color: #86909c; }
  .lite-abac-table-wrap { overflow-x: auto; }
  .lite-abac-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    text-align: left;
  }
  .lite-abac-table th, .lite-abac-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #f2f3f5;
  }
  .lite-abac-table th { background: #fafafa; font-weight: 600; color: #4e5969; font-size: 11px; }
  .font-mono { font-family: monospace; font-size: 11px; }
  .text-muted { color: #86909c; }
  .lite-r-name { font-weight: 500; color: #1d2129; }
  .lite-r-effect {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 2px;
    text-transform: uppercase;
  }
  .lite-eff-allow { background: #e8ffea; color: #00b42a; }
  .lite-eff-mask { background: #e8f3ff; color: #165dff; }
  .lite-eff-mfa { background: #fff7e8; color: #ff7d00; }
  .lite-eff-deny { background: #ffece8; color: #f53f3f; }
  .lite-status-txt { font-size: 11px; color: #4e5969; }
</style>
