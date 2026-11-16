<script lang="ts">
  import { createI18nScope, provideI18nScope, useTranslation } from '@svadmin/core/i18n';
  import ListPagination from '../../../packages/ui/src/components/ListPagination.svelte';
  import ListFooter from '../../../packages/ui/src/components/ListFooter.svelte';
  import '@svadmin/ui/app.theme.css';

  provideI18nScope(createI18nScope({ locale: 'zh-CN' }));
  const i18n = useTranslation();
  let page = $state(1);
  let pageSize = $state(10);
  let showSummary = $state(true);
  let empty = $state(false);
  let footerSize = $state(50);
  const total = $derived(empty ? 0 : 23);
  const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));
  const rows = $derived(Array.from({ length: total }, (_, index) => index + 1)
    .slice((page - 1) * pageSize, page * pageSize));
  function changeSize(value: number): void { pageSize = value; page = 1; }
</script>

<main>
  <h1>ListPagination · 每页条数往返</h1>
  <div class="options">
    <label><input type="checkbox" bind:checked={showSummary} />显示汇总文字</label>
    <label><input type="checkbox" bind:checked={empty} onchange={() => { page = 1; }} />空结果</label>
    <button type="button" onclick={() => i18n.setLocale(i18n.locale === 'zh-CN' ? 'en' : 'zh-CN')}>切换语言</button>
  </div>
  <div class="layout">
    <section class="panel" aria-label="记录列表">
      <header><h2>记录列表</h2><span>当前第 {page} 页 · 每页 {pageSize} 条</span></header>
      <table><thead><tr><th>记录</th><th>待办</th></tr></thead><tbody>
        {#each rows as row (row)}<tr><td>RECORD-{String(row).padStart(3, '0')}</td><td>核对申请资料 {row}</td></tr>{/each}
      </tbody></table>
      <div class="pagination" data-testid="main-pagination">
        <ListPagination label="Records" {page} {totalPages} {total} {pageSize} {showSummary}
          rangeStart={total ? (page - 1) * pageSize + 1 : 0} rangeEnd={Math.min(page * pageSize, total)}
          onPageChange={(value) => { page = value; }} onPageSizeChange={changeSize} />
      </div>
    </section>
    <aside class="panel" aria-label="ListFooter组合">
      <header><h2>ListFooter 组合</h2></header>
      <p>独立23条结果，汇总文字只出现一次。</p>
      <ListFooter label="Footer records" total={23} loadedCount={23} page={1}
        totalPages={Math.max(1, Math.ceil(23 / footerSize))} pageSize={footerSize}
        rangeStart={1} rangeEnd={Math.min(23, footerSize)} onPageChange={() => {}}
        onPageSizeChange={(value) => { footerSize = value; }} />
    </aside>
  </div>
</main>

<style>
  :global(body) { margin: 0; background: #f4f5f7; color: #1d2129; font: 14px/1.4 system-ui, sans-serif; }
  main { max-width: 1680px; margin: 0 auto; padding: 28px 36px; }
  h1 { margin: 0 0 18px; font-size: 22px; }
  h2 { margin: 0; font-size: 16px; }
  .options { display: flex; align-items: center; gap: 24px; margin-bottom: 20px; }
  .options label { display: flex; align-items: center; gap: 6px; }
  .options button { min-height: 32px; padding: 0 12px; border: 1px solid #c9cdd4; border-radius: 4px; background: white; font: inherit; }
  .layout { display: grid; grid-template-columns: minmax(0, 1fr) 400px; align-items: start; gap: 24px; }
  .panel { min-width: 0; overflow: hidden; border: 1px solid #e5e6eb; border-radius: 6px; background: white; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; border-bottom: 1px solid #e5e6eb; }
  header span { color: #4e5969; }
  table { width: 100%; border-collapse: collapse; text-align: left; }
  th { background: #f2f3f5; }
  th, td { height: 24px; padding: 0 14px; border-bottom: 1px solid #f2f3f5; }
  .pagination { padding: 12px 16px; }
  aside p { margin: 16px; color: #4e5969; }
  aside :global([data-svadmin-list-footer]) { margin: 16px; }
</style>
