<script lang="ts">
  import { Button } from '../../../packages/ui/src/components/ui/button/index.js';
</script>

<main class="evidence-shell">
  <h1>Button title fallback</h1>
  <p class="evidence-copy">Disabled controls can still explain the blocker when only title is present.</p>
  <div class="evidence-row">
    <Button disabled title="选择客户后才能创建委托单。">创建委托单</Button>
    <Button disabled title="审批意见必填。" disabledReason="请填写审批意见后提交。">提交审批</Button>
    <Button title="仅作为原生提示，不会禁用。">可用操作</Button>
  </div>
  <p class="evidence-hint">悬停或键盘聚焦禁用按钮查看原因；第三个按钮保持可用。</p>
</main>

<style>
  :global(body) { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
  .evidence-shell { min-height: 100vh; padding: 48px; display: grid; align-content: start; gap: 16px; }
  h1 { margin: 0; font-size: 24px; }
  .evidence-copy, .evidence-hint { margin: 0; color: #475569; }
  .evidence-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; padding: 24px; border: 1px solid #cbd5e1; border-radius: 12px; background: white; }
</style>
