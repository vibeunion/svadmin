<script lang="ts">
  interface ApprovalNode {
    id: string;
    title: string;
    approver: string;
    status: 'passed' | 'current' | 'pending';
    mode?: 'serial' | 'parallel';
  }

  interface Props {
    title?: string;
    nodes?: ApprovalNode[];
    class?: string;
  }

  let {
    title = '业务审批流链条',
    nodes = [
      { id: 'n1', title: '发起申请', approver: '经办人 (王立)', status: 'passed' },
      { id: 'n2', title: '部门负责人初审', approver: '业务主管 (张明)', status: 'passed' },
      { id: 'n3', title: '财务合规复核', approver: '财务审计组', status: 'current', mode: 'parallel' },
      { id: 'n4', title: '总经理终审', approver: '决策层审批人', status: 'pending' }
    ],
    class: className = '',
  }: Props = $props();

  function getNodeStyle(st: string): { badge: string; color: string; bg: string } {
    switch (st) {
      case 'passed': return { badge: '✓ 已通过', color: '#00b42a', bg: '#e8ffea' };
      case 'current': return { badge: '● 进行中', color: '#165dff', bg: '#e8f3ff' };
      default: return { badge: '○ 待审批', color: '#86909c', bg: '#f2f3f5' };
    }
  }
</script>

<div
  class="lite-approval-chain {className}"
  data-svadmin-component="LiteApprovalChainBuilder"
  role="region"
  aria-label="Approval Chain"
>
  <header class="lite-chain-header">
    <h4 class="lite-chain-title">{title}</h4>
    <span class="lite-chain-total">{nodes.length} 级审批节点</span>
  </header>

  <div class="lite-chain-list">
    {#each nodes as node, idx (node.id)}
      {@const st = getNodeStyle(node.status)}
      <div class="lite-chain-step">
        <div class="lite-step-index">{idx + 1}</div>
        <div class="lite-step-content">
          <div class="lite-step-top">
            <span class="lite-step-name">{node.title}</span>
            <span class="lite-step-badge" style="color: {st.color}; background: {st.bg};">
              {st.badge}
            </span>
          </div>
          <div class="lite-step-approver">
            审批人: {node.approver}
            {#if node.mode === 'parallel'}
              <span class="lite-step-mode">或签 / 会签</span>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .lite-approval-chain {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-chain-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-chain-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-chain-total { font-size: 11px; color: #86909c; }
  .lite-chain-list { padding: 12px 14px; }
  .lite-chain-step {
    display: flex;
    align-items: flex-start;
    padding-bottom: 12px;
    margin-bottom: 12px;
    border-bottom: 1px dashed #e5e6eb;
  }
  .lite-chain-step:last-child {
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0;
  }
  .lite-step-index {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #165dff;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
  }
  .lite-step-content { flex: 1; }
  .lite-step-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
  .lite-step-name { font-weight: 600; color: #1d2129; font-size: 12px; }
  .lite-step-badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 3px; }
  .lite-step-approver { font-size: 11px; color: #4e5969; }
  .lite-step-mode { font-size: 10px; color: #86909c; margin-left: 6px; background: #f2f3f5; padding: 1px 4px; border-radius: 2px; }
</style>
