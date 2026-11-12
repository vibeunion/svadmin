<script lang="ts">
  interface Props {
    title?: string;
    nodeName?: string;
    nodeType?: string;
    approverRole?: string;
    approvalMode?: string;
    class?: string;
  }

  let {
    title = '流程节点属性检查器 (SSR 静态面板)',
    nodeName = '部门主管审批节点',
    nodeType = '审批节点',
    approverRole = '直属部门经理',
    approvalMode = '会签 (全员同意)',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-node-inspector {className}"
  data-svadmin-component="LiteWorkflowNodeInspector"
  role="region"
  aria-label="Workflow Node Inspector"
>
  <header class="lite-insp-header">
    <span class="lite-insp-icon">⚙️</span>
    <h4 class="lite-insp-title">{title}</h4>
  </header>

  <div class="lite-insp-body">
    <div class="lite-prop-row">
      <span class="lite-prop-label">节点名称:</span>
      <span class="lite-prop-val">{nodeName}</span>
    </div>
    <div class="lite-prop-row">
      <span class="lite-prop-label">节点类型:</span>
      <span class="lite-prop-val">{nodeType}</span>
    </div>
    <div class="lite-prop-row">
      <span class="lite-prop-label">审批角色:</span>
      <span class="lite-prop-val">{approverRole}</span>
    </div>
    <div class="lite-prop-row">
      <span class="lite-prop-label">流转模式:</span>
      <span class="lite-prop-val">{approvalMode}</span>
    </div>
  </div>
</div>

<style>
  .lite-node-inspector {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-insp-header {
    display: flex;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-insp-icon { font-size: 14px; margin-right: 6px; }
  .lite-insp-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-insp-body { padding: 12px 14px; }
  .lite-prop-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px dashed #f2f3f5;
  }
  .lite-prop-row:last-child { border-bottom: none; }
  .lite-prop-label { color: #86909c; }
  .lite-prop-val { font-weight: 500; color: #1d2129; }
</style>
