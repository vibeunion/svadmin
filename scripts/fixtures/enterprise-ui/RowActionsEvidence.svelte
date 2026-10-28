<script lang="ts">
  import RowActions, { type RowActionItem } from '../../../packages/ui/src/components/RowActions.svelte';

  let lastAction = $state('none');
  const actions: RowActionItem[] = [
    { label: '查看详情', onclick: () => { lastAction = 'view'; } },
    { label: '编辑', onclick: () => { lastAction = 'edit'; } },
    { label: '审批通过', disabled: true, disabledReason: '缺少电子签名，无法审批。' },
    { label: '删除', danger: true, disabled: true, disabledReason: '已签发报告不可删除。' },
  ];
</script>

<main class="row-actions-evidence" data-testid="row-actions-evidence">
  <p class="eyebrow">SVADMIN · ROW ACTIONS</p>
  <h1>受控禁用原因</h1>
  <p>禁用操作保留原因说明；按钮通过 tooltip 暴露，溢出菜单内就地展示。</p>
  <div class="clip" data-testid="row-actions-clip">
    <div class="panel">
      <span>FA-26-000073</span>
      <RowActions {actions} maxVisible={1} moreLabel="更多操作" />
    </div>
  </div>
  <output data-testid="last-action">{lastAction}</output>
</main>

<style>
  .row-actions-evidence { max-width: 64rem; margin: 3rem auto; padding: 0 1.5rem; color: #0f172a; }
  .eyebrow { margin: 0 0 .5rem; color: #64748b; font-size: .75rem; letter-spacing: .12em; }
  h1 { margin: 0 0 .5rem; font-size: 1.75rem; }
  p { color: #475569; }
  .clip { overflow: hidden; display: flex; align-items: flex-end; height: 8rem; margin-top: 2rem; border: 1px dashed #94a3b8; border-radius: .75rem; }
  .panel { display: flex; align-items: center; justify-content: space-between; gap: 1rem; width: 100%; border: 1px solid #e2e8f0; border-radius: .75rem; padding: .75rem 1.25rem; background: #fff; }
  output { display: block; margin-top: 1rem; color: #64748b; font-size: .875rem; }
</style>
