<script lang="ts">
  interface MappingPair {
    sourceCol: string;
    targetField: string;
    required?: boolean;
    sampleVal?: string;
  }

  interface Props {
    title?: string;
    mappings?: MappingPair[];
    class?: string;
  }

  let {
    title = '字段映射与模式转换',
    mappings = [
      { sourceCol: '用户姓名', targetField: 'full_name', required: true, sampleVal: '张伟' },
      { sourceCol: '手机联系方式', targetField: 'mobile_phone', required: true, sampleVal: '13800138000' },
      { sourceCol: '所属部门', targetField: 'department_id', required: false, sampleVal: '技术研发部' },
      { sourceCol: '入职日期', targetField: 'joined_at', required: false, sampleVal: '2026-03-01' }
    ],
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-col-mapping {className}"
  data-svadmin-component="LiteColumnMappingTable"
  role="region"
  aria-label="Column Mapping Table"
>
  <header class="lite-mapping-header">
    <h4 class="lite-mapping-title">{title}</h4>
    <span class="lite-mapping-count">{mappings.length} 个字段映射</span>
  </header>

  <div class="lite-mapping-table-wrap">
    <table class="lite-mapping-table">
      <thead>
        <tr>
          <th>文件原始列名</th>
          <th>映射目标字段</th>
          <th>必填约束</th>
          <th>数据样本</th>
        </tr>
      </thead>
      <tbody>
        {#each mappings as m (m.sourceCol)}
          <tr>
            <td class="font-bold">{m.sourceCol}</td>
            <td><code class="lite-field-code">{m.targetField}</code></td>
            <td>
              {#if m.required}
                <span class="lite-tag-req">必填</span>
              {:else}
                <span class="lite-tag-opt">可选</span>
              {/if}
            </td>
            <td class="lite-sample-text">{m.sampleVal ?? '—'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .lite-col-mapping {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-mapping-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-mapping-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-mapping-count { font-size: 11px; color: #86909c; }
  .lite-mapping-table-wrap { overflow-x: auto; }
  .lite-mapping-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 11px; }
  .lite-mapping-table th {
    padding: 8px 12px;
    background: #f2f3f5;
    border-bottom: 1px solid #e5e6eb;
    color: #4e5969;
    font-weight: 600;
  }
  .lite-mapping-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #f2f3f5;
    color: #1d2129;
  }
  .font-bold { font-weight: 600; }
  .lite-field-code { font-family: monospace; font-size: 11px; color: #165dff; background: #e8f3ff; padding: 2px 5px; border-radius: 3px; }
  .lite-tag-req { font-size: 10px; color: #f53f3f; background: #ffece8; padding: 1px 4px; border-radius: 3px; font-weight: 500; }
  .lite-tag-opt { font-size: 10px; color: #86909c; background: #f2f3f5; padding: 1px 4px; border-radius: 3px; }
  .lite-sample-text { color: #86909c; font-family: monospace; }
</style>
