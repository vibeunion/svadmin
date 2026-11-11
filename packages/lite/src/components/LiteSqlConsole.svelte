<script lang="ts">
  interface Column {
    name: string;
    type?: string;
  }

  interface Props {
    title?: string;
    query?: string;
    columns?: Column[];
    rows?: Record<string, string | number | null>[];
    rowCount?: number;
    executionTimeMs?: number;
    class?: string;
  }

  let {
    title = 'SQL 只读查询控制台',
    query = 'SELECT id, tenant_id, name, created_at FROM sys_tenants LIMIT 10;',
    columns = [
      { name: 'id', type: 'uuid' },
      { name: 'tenant_id', type: 'varchar' },
      { name: 'name', type: 'varchar' },
      { name: 'created_at', type: 'timestamp' }
    ],
    rows = [
      { id: '1a2b-3c4d', tenant_id: 't_enterprise', name: '上海华东研发中心', created_at: '2026-11-10 10:00:00' },
      { id: '5e6f-7g8h', tenant_id: 't_standard', name: '北京华北创新科技', created_at: '2026-11-11 14:30:00' }
    ],
    rowCount = 2,
    executionTimeMs = 12,
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-sql-console {className}"
  data-svadmin-component="LiteSqlConsole"
  role="region"
  aria-label="SQL Console"
>
  <header class="lite-sql-header">
    <div class="lite-sql-title-wrap">
      <span class="lite-sql-tag">READONLY</span>
      <h4 class="lite-sql-title">{title}</h4>
    </div>
    <span class="lite-sql-stats">{rowCount} 行记录 · 耗时 {executionTimeMs}ms</span>
  </header>

  <div class="lite-sql-query-box">
    <code>{query}</code>
  </div>

  <div class="lite-sql-table-wrap">
    <table class="lite-sql-table">
      <thead>
        <tr>
          {#each columns as col (col)}
            <th>{col.name} <span class="lite-sql-col-type">({col.type ?? 'text'})</span></th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rows as row, rIdx (rIdx)}
          <tr>
            {#each columns as col (col)}
              <td>{row[col.name] ?? 'NULL'}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .lite-sql-console {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-sql-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-sql-title-wrap { display: flex; align-items: center; }
  .lite-sql-title-wrap > * + * { margin-left: 8px; }
  .lite-sql-tag {
    font-size: 10px;
    font-weight: 700;
    color: #165dff;
    background: #e8f3ff;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .lite-sql-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-sql-stats { font-size: 11px; color: #86909c; font-family: monospace; }
  .lite-sql-query-box {
    padding: 10px 14px;
    background: #272e3b;
    color: #f2f3f5;
    font-family: monospace;
    font-size: 11px;
    overflow-x: auto;
  }
  .lite-sql-table-wrap { overflow-x: auto; }
  .lite-sql-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 11px; }
  .lite-sql-table th {
    padding: 8px 12px;
    background: #f2f3f5;
    border-bottom: 1px solid #e5e6eb;
    color: #4e5969;
    font-weight: 600;
  }
  .lite-sql-col-type { font-size: 10px; color: #86909c; font-weight: normal; }
  .lite-sql-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #f2f3f5;
    color: #1d2129;
    font-family: monospace;
  }
</style>
