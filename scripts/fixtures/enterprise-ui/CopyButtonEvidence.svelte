<script lang="ts">
  import CopyButton from '../../../packages/ui/src/components/CopyButton.svelte';
</script>

<main class="evidence-shell">
  <h1>Copy button</h1>
  <p class="evidence-copy">A compact icon button for copying identifiers with accessible success and failure feedback.</p>
  <section class="evidence-panel">
    <div class="evidence-row">
      <div><span>委托单号</span><strong>FA-2026-1029-001</strong></div>
      <CopyButton value="FA-2026-1029-001" description="完整编号" />
    </div>
    <div class="evidence-row">
      <div><span>项目号</span><strong>PRJ-XIGU-2026-0042</strong></div>
      <CopyButton value="PRJ-XIGU-2026-0042" description="项目号" />
    </div>
    <div class="evidence-row">
      <div><span>空编号</span><strong>—</strong></div>
      <CopyButton value="" description="空编号" />
    </div>
  </section>
</main>

<style>
  :global(body) { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
  .evidence-shell { min-height: 100vh; padding: 48px; display: grid; align-content: start; gap: 16px; }
  h1 { margin: 0; font-size: 24px; }
  .evidence-copy { margin: 0 0 12px; color: #475569; }
  .evidence-panel { display: grid; gap: 0; padding: 8px 24px; border: 1px solid #cbd5e1; border-radius: 12px; background: white; }
  .evidence-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 64px; border-bottom: 1px solid #e2e8f0; }
  .evidence-row:last-child { border-bottom: 0; }
  .evidence-row > div { display: grid; gap: 4px; }
  .evidence-row span { color: #64748b; font-size: 12px; }
  .evidence-row strong { font-size: 14px; }
</style>
