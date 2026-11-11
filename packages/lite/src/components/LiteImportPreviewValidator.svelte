<script lang="ts">
  interface ValidationError {
    row: number;
    col: string;
    value: string;
    message: string;
  }

  interface Props {
    title?: string;
    totalRows?: number;
    validRows?: number;
    errors?: ValidationError[];
    class?: string;
  }

  let {
    title = '导入数据预检与错误定位',
    totalRows = 100,
    validRows = 98,
    errors = [
      { row: 14, col: 'mobile_phone', value: '138000', message: '手机号格式非法，必须为11位国内有效号码' },
      { row: 42, col: 'email', value: 'invalid-email', message: '电子邮箱格式不合规' }
    ],
    class: className = '',
  }: Props = $props();

  const errorCount = $derived(errors.length);
</script>

<div
  class="lite-preview-validator {className}"
  data-svadmin-component="LiteImportPreviewValidator"
  role="region"
  aria-label="Import Preview Validator"
>
  <header class="lite-validator-header">
    <h4 class="lite-validator-title">{title}</h4>
    <div class="lite-stats-wrap">
      <span class="lite-stat-total">总记录: {totalRows}</span>
      <span class="lite-stat-valid">合格: {validRows}</span>
      {#if errorCount > 0}
        <span class="lite-stat-err">异常: {errorCount}</span>
      {/if}
    </div>
  </header>

  <div class="lite-validator-body">
    {#if errorCount === 0}
      <div class="lite-valid-notice">
        ✓ 所有导入记录校验通过，未发现格式或必填项异常。
      </div>
    {:else}
      <div class="lite-errors-list">
        <div class="lite-err-notice">
          发现 {errorCount} 处数据格式异常，建议修正后重新上传或选择忽略错误行入库。
        </div>
        <table class="lite-errors-table">
          <thead>
            <tr>
              <th>数据行号</th>
              <th>异常列</th>
              <th>当前取值</th>
              <th>失败原因说明</th>
            </tr>
          </thead>
          <tbody>
            {#each errors as err (err.row + err.col)}
              <tr>
                <td class="font-mono">第 {err.row} 行</td>
                <td><code>{err.col}</code></td>
                <td class="lite-err-val">{err.value}</td>
                <td class="lite-err-msg">{err.message}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<style>
  .lite-preview-validator {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-validator-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-validator-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-stats-wrap { display: flex; font-size: 11px; font-weight: 500; }
  .lite-stats-wrap > * + * { margin-left: 8px; }
  .lite-stat-total { color: #4e5969; }
  .lite-stat-valid { color: #00b42a; }
  .lite-stat-err { color: #f53f3f; }
  .lite-validator-body { padding: 12px 14px; }
  .lite-valid-notice {
    padding: 10px;
    background: #e8ffea;
    color: #00b42a;
    border-radius: 4px;
    font-weight: 500;
  }
  .lite-err-notice {
    padding: 8px 10px;
    background: #ffece8;
    color: #f53f3f;
    border-radius: 4px;
    font-size: 11px;
    margin-bottom: 10px;
  }
  .lite-errors-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 11px; }
  .lite-errors-table th {
    padding: 6px 10px;
    background: #f2f3f5;
    border-bottom: 1px solid #e5e6eb;
    color: #4e5969;
  }
  .lite-errors-table td {
    padding: 6px 10px;
    border-bottom: 1px solid #f2f3f5;
  }
  .font-mono { font-family: monospace; font-weight: 600; }
  code { font-family: monospace; color: #165dff; }
  .lite-err-val { color: #f53f3f; font-family: monospace; }
  .lite-err-msg { color: #4e5969; }
</style>
