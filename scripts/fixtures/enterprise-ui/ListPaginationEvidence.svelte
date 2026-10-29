<script lang="ts">
  import ListFooter from '../../../packages/ui/src/components/ListFooter.svelte';
  import { Button } from '../../../packages/ui/src/components/ui/button/index.js';

  let page = $state(2);
  const pageSize = 20;
  const total = 137;
  const totalPages = Math.ceil(total / pageSize);
  const rangeStart = $derived((page - 1) * pageSize + 1);
  const rangeEnd = $derived(Math.min(page * pageSize, total));
</script>

<main class="evidence-shell">
  <h1>List footer and pagination</h1>
  <p class="evidence-copy">A generic desktop list footer with loaded-count guidance and controlled page navigation.</p>
  <section class="evidence-panel">
    <div class="evidence-toolbar"><strong>委托单</strong><Button variant="outline" onclick={() => page = 1}>回到第一页</Button></div>
    <ListFooter
      label="委托单"
      showSummary
      {total}
      loadedCount={137}
      {page}
      {totalPages}
      {rangeStart}
      {rangeEnd}
      {pageSize}
      pageSizeOptions={[10, 20, 50]}
      onPageChange={(next) => page = next}
    />
  </section>
  <section class="evidence-panel">
    <div class="evidence-toolbar"><strong>截断说明</strong><span>仅展示前 2500 条</span></div>
    <ListFooter
      label="检索结果"
      showSummary
      total={5000}
      loadedCount={2500}
      truncated
      maxRecords={2500}
      page={1}
      totalPages={50}
      rangeStart={1}
      rangeEnd={50}
      onPageChange={() => {}}
    />
  </section>
</main>

<style>
  :global(body) { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
  .evidence-shell { min-height: 100vh; padding: 48px; display: grid; align-content: start; gap: 16px; }
  h1 { margin: 0; font-size: 24px; }
  .evidence-copy { margin: 0; color: #475569; }
  .evidence-panel { display: grid; gap: 20px; padding: 24px; border: 1px solid #cbd5e1; border-radius: 12px; background: white; }
  .evidence-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
</style>
