<script lang="ts">
  interface PolicyItem {
    id: string;
    fieldName: string;
    ruleType: string;
    level: string;
    exemptRole: string;
    enabled: boolean;
  }

  interface Props {
    title?: string;
    policies?: PolicyItem[];
    class?: string;
  }

  let {
    title = '动态数据脱敏策略中心',
    policies = [
      { id: 'p1', fieldName: 'mobile_phone', ruleType: '手机号脱敏', level: 'L3 机密', exemptRole: '超级管理员', enabled: true },
      { id: 'p2', fieldName: 'resident_id_card', ruleType: '居民身份证', level: 'L4 极高', exemptRole: '合规风控员', enabled: true },
      { id: 'p3', fieldName: 'bank_card_number', ruleType: '银行借记卡', level: 'L4 极高', exemptRole: '财务主管', enabled: true },
      { id: 'p4', fieldName: 'corporate_email', ruleType: '电子邮箱前缀', level: 'L2 内部', exemptRole: '全员', enabled: false }
    ],
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-mask-policy {className}"
  data-svadmin-component="LiteDataMaskPolicyEngine"
  role="region"
  aria-label="Data Mask Policy Engine"
>
  <header class="lite-mask-header">
    <div>
      <h4 class="lite-mask-title">{title}</h4>
      <span class="lite-mask-meta">基于密级与角色动态下发，纯前端算法沙箱</span>
    </div>
    <span class="lite-policy-count">{policies.length} 项脱敏策略</span>
  </header>

  <div class="lite-mask-table-wrap">
    <table class="lite-mask-table">
      <thead>
        <tr>
          <th>字段标识</th>
          <th>算法类型</th>
          <th>安全密级</th>
          <th>豁免角色</th>
          <th>状态</th>
        </tr>
      </thead>
      <tbody>
        {#each policies as p (p.id)}
          <tr class:lite-tr-disabled={!p.enabled}>
            <td class="lite-td-field font-mono">{p.fieldName}</td>
            <td>{p.ruleType}</td>
            <td>
              <span
                class="lite-level-badge"
                class:lite-lvl-high={p.level.includes('L4')}
                class:lite-lvl-warn={p.level.includes('L3')}
              >
                {p.level}
              </span>
            </td>
            <td><span class="lite-role-badge">{p.exemptRole}</span></td>
            <td>
              <span class="lite-status-badge" class:lite-st-on={p.enabled}>
                {p.enabled ? '已启用' : '已停用'}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .lite-mask-policy {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-mask-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-mask-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-mask-meta { font-size: 11px; color: #86909c; display: block; margin-top: 2px; }
  .lite-policy-count { font-size: 11px; color: #165dff; font-weight: 600; }
  .lite-mask-table-wrap { overflow-x: auto; }
  .lite-mask-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 11px; }
  .lite-mask-table th {
    padding: 8px 12px;
    background: #f2f3f5;
    border-bottom: 1px solid #e5e6eb;
    color: #4e5969;
    font-weight: 600;
  }
  .lite-mask-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #f2f3f5;
    color: #1d2129;
  }
  .lite-tr-disabled { opacity: 0.6; }
  .lite-td-field { font-weight: 600; }
  .font-mono { font-family: monospace; }
  .lite-level-badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
    background: #f2f3f5;
    color: #4e5969;
  }
  .lite-lvl-high { background: #ffece8; color: #f53f3f; }
  .lite-lvl-warn { background: #fff7e8; color: #ff7d00; }
  .lite-role-badge { background: #e8f3ff; color: #165dff; padding: 1px 6px; border-radius: 3px; font-size: 10px; }
  .lite-status-badge { font-size: 10px; color: #86909c; }
  .lite-st-on { color: #00b42a; font-weight: 600; }
</style>
