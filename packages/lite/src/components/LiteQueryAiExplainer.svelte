<script lang="ts">
  interface Props {
    title?: string;
    queryText?: string;
    contextName?: string;
    explanation?: string;
    class?: string;
  }

  let {
    title = 'AI 规则语义解释卡片',
    queryText = "WHERE region = 'East' AND amount >= 50000",
    contextName = '大额核销清单',
    explanation = '该查询用于筛选属于华东大区且结算金额不低于 5 万元的所有合规单据。',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-query-explainer {className}"
  data-svadmin-component="LiteQueryAiExplainer"
  role="region"
  aria-label="Query AI Explainer"
>
  <header class="lite-explainer-header">
    <div class="lite-explainer-title-wrap">
      <span class="lite-explainer-icon">✨</span>
      <h4 class="lite-explainer-title">{title}</h4>
      <span class="lite-explainer-ctx">({contextName})</span>
    </div>
  </header>

  <div class="lite-explainer-body">
    <div class="lite-query-code">
      <code>{queryText}</code>
    </div>

    <div class="lite-explanation-box">
      <div class="lite-explanation-title">业务通俗口径解释：</div>
      <div class="lite-explanation-content">{explanation}</div>
    </div>
  </div>
</div>

<style>
  .lite-query-explainer {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-explainer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-explainer-title-wrap { display: flex; align-items: center; }
  .lite-explainer-title-wrap > * + * { margin-left: 6px; }
  .lite-explainer-icon { color: #165dff; font-size: 12px; }
  .lite-explainer-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-explainer-ctx { font-size: 11px; color: #86909c; }
  .lite-explainer-body { padding: 12px 14px; }
  .lite-query-code {
    background: #f2f3f5;
    padding: 8px 12px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 11px;
    color: #1d2129;
    margin-bottom: 10px;
    overflow-x: auto;
  }
  .lite-explanation-box {
    background: #e8f3ff;
    border: 1px solid #bedaff;
    border-radius: 6px;
    padding: 10px 12px;
  }
  .lite-explanation-title { font-weight: 600; color: #165dff; font-size: 11px; margin-bottom: 4px; }
  .lite-explanation-content { color: #1d2129; line-height: 1.5; font-size: 12px; }
</style>
