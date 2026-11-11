<script lang="ts">
  interface Props {
    title?: string;
    rowDimensionLabel?: string;
    colDimensionLabel?: string;
    measureLabel?: string;
    cols?: string[];
    rows?: { name: string; cells: (number | string)[]; total: number | string }[];
    grandTotals?: (number | string)[];
    grandTotalAll?: number | string;
    class?: string;
  }

  let {
    title = '多维交叉透视分析矩阵',
    rowDimensionLabel = '区域 / 部门',
    colDimensionLabel = '季度',
    measureLabel = '销售额 (SUM)',
    cols = ['2026 Q1', '2026 Q2', '2026 Q3', '2026 Q4'],
    rows = [
      { name: '华东大区 / 软件业务部', cells: ['¥ 1,280,000', '¥ 1,540,000', '¥ 1,120,000', '¥ 1,350,000'], total: '¥ 5,290,000' },
      { name: '华南大区 / 跨境电商部', cells: ['¥ 950,000', '¥ 1,020,000', '¥ 1,480,000', '¥ 1,890,000'], total: '¥ 5,340,000' },
      { name: '华北大区 / 政府业务线', cells: ['¥ 820,000', '¥ 780,000', '¥ 910,000', '¥ 1,320,000'], total: '¥ 3,830,000' }
    ],
    grandTotals = ['¥ 3,050,000', '¥ 3,340,000', '¥ 3,510,000', '¥ 4,560,000'],
    grandTotalAll = '¥ 14,460,000',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-pivot-matrix {className}"
  data-svadmin-component="LitePivotMatrix"
  role="region"
  aria-label="Pivot Matrix"
>
  <header class="lite-pivot-header">
    <div class="lite-pivot-title-wrap">
      <h4 class="lite-pivot-title">{title}</h4>
      <span class="lite-pivot-meta">行: {rowDimensionLabel} ✕ 列: {colDimensionLabel}</span>
    </div>
    <span class="lite-pivot-measure">{measureLabel}</span>
  </header>

  <div class="lite-pivot-table-wrap">
    <table class="lite-pivot-table">
      <thead>
        <tr>
          <th class="lite-th-rowdim">{rowDimensionLabel}</th>
          {#each cols as col (col)}
            <th class="lite-th-coldim">{col}</th>
          {/each}
          <th class="lite-th-rowtotal">行汇总</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.name)}
          <tr>
            <td class="lite-td-rowname">{row.name}</td>
            {#each row.cells as cell, idx (idx)}
              <td class="lite-td-cell">{cell}</td>
            {/each}
            <td class="lite-td-rowtotal">{row.total}</td>
          </tr>
        {/each}
      </tbody>
      <tfoot>
        <tr class="lite-tr-grandtotal">
          <td class="lite-td-grandlabel">列汇总</td>
          {#each grandTotals as gTotal, idx (idx)}
            <td class="lite-td-coltotal">{gTotal}</td>
          {/each}
          <td class="lite-td-grandall">{grandTotalAll}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</div>

<style>
  .lite-pivot-matrix {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-pivot-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-pivot-title-wrap { display: block; }
  .lite-pivot-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-pivot-meta { font-size: 11px; color: #86909c; display: block; margin-top: 2px; }
  .lite-pivot-measure {
    font-size: 11px;
    font-weight: 600;
    color: #165dff;
    background: #e8f3ff;
    padding: 2px 8px;
    border-radius: 4px;
  }
  .lite-pivot-table-wrap { overflow-x: auto; }
  .lite-pivot-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 11px; }
  .lite-pivot-table th {
    padding: 8px 12px;
    background: #f2f3f5;
    border-bottom: 1px solid #e5e6eb;
    border-right: 1px solid #e5e6eb;
    color: #4e5969;
    font-weight: 600;
  }
  .lite-th-coldim, .lite-th-rowtotal, .lite-td-cell, .lite-td-rowtotal, .lite-td-coltotal, .lite-td-grandall {
    text-align: right;
  }
  .lite-th-rowtotal { background: #e8f3ff; color: #165dff; }
  .lite-pivot-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #f2f3f5;
    border-right: 1px solid #f2f3f5;
    color: #1d2129;
  }
  .lite-td-rowname { font-weight: 600; background: #fafbfc; }
  .lite-td-cell { font-family: monospace; }
  .lite-td-rowtotal { font-family: monospace; font-weight: 600; background: #fafbfc; }
  .lite-tr-grandtotal td {
    border-top: 2px solid #e5e6eb;
    background: #f7f8fa;
    font-weight: 700;
  }
  .lite-td-grandlabel { color: #1d2129; }
  .lite-td-coltotal { font-family: monospace; }
  .lite-td-grandall { font-family: monospace; color: #165dff; font-size: 12px; }
</style>
