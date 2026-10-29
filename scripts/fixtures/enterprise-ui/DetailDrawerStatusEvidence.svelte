<script lang="ts">
  import DetailDrawer from '../../../packages/ui/src/components/DetailDrawer.svelte';

  let open = $state(true);
</script>

<main class="evidence-shell">
  <h1>Detail drawer status</h1>
  <p class="evidence-copy">A drawer keeps its title, description, status badge, extra slot and footer aligned.</p>
  <button type="button" onclick={() => open = true}>重新打开抽屉</button>
  <DetailDrawer
    bind:open
    title="FA-2026-001 · 委托单详情"
    description="客户、项目与当前办理状态"
    statusLabel="执行中"
    statusTone="info"
    width="max-w-3xl w-full"
  >
    {#snippet extra()}<span class="evidence-extra">市场负责人已确认</span>{/snippet}
    <div class="evidence-body">
      <p><strong>委托单位</strong><span>示例客户</span></p>
      <p><strong>当前步骤</strong><span>样品接收与任务派工</span></p>
    </div>
    {#snippet footer()}<span>共 3 个项目</span>{/snippet}
  </DetailDrawer>
</main>

<style>
  :global(body) { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
  .evidence-shell { min-height: 100vh; padding: 48px; display: grid; align-content: start; gap: 16px; }
  h1 { margin: 0; font-size: 24px; }
  .evidence-copy { margin: 0; color: #475569; }
  .evidence-extra { font-size: 13px; color: #475569; }
  .evidence-body { display: grid; gap: 12px; padding: 24px; }
  .evidence-body p { margin: 0; display: grid; grid-template-columns: 8rem 1fr; gap: 16px; }
</style>
