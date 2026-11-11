<script lang="ts">
  interface Props {
    title?: string;
    fingerprint?: string;
    operator?: string;
    rowCount?: number;
    format?: string;
    generatedAt?: string;
    class?: string;
  }

  let {
    title = '安全数据导出与审计水印溯源',
    fingerprint = 'FP-202611-9842A',
    operator = 'admin@example.com',
    rowCount = 1250,
    format = 'CSV (UTF-8 with BOM)',
    generatedAt = '2026-11-12 06:00:00',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-secure-exporter {className}"
  data-svadmin-component="LiteSecureDataExporter"
  role="region"
  aria-label="Secure Data Exporter"
>
  <header class="lite-exporter-header">
    <div class="lite-exporter-title-wrap">
      <span class="lite-exporter-shield">🛡️ 安全审计</span>
      <h4 class="lite-exporter-title">{title}</h4>
    </div>
    <span class="lite-fp-tag">指纹: {fingerprint}</span>
  </header>

  <div class="lite-exporter-body">
    <div class="lite-meta-grid">
      <div class="lite-meta-item">
        <span class="lite-meta-label">导出操作员</span>
        <span class="lite-meta-val">{operator}</span>
      </div>
      <div class="lite-meta-item">
        <span class="lite-meta-label">记录行数</span>
        <span class="lite-meta-val">{rowCount} 条</span>
      </div>
      <div class="lite-meta-item">
        <span class="lite-meta-label">文件格式</span>
        <span class="lite-meta-val">{format}</span>
      </div>
      <div class="lite-meta-item">
        <span class="lite-meta-label">生成时间</span>
        <span class="lite-meta-val font-mono">{generatedAt}</span>
      </div>
    </div>

    <div class="lite-exporter-watermark-note">
      导出的文件头部已内嵌数字隐形防伪指纹，严禁向外部未经授权机构分发传输。
    </div>
  </div>
</div>

<style>
  .lite-secure-exporter {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-exporter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-exporter-title-wrap { display: flex; align-items: center; gap: 8px; }
  .lite-exporter-shield { font-size: 11px; font-weight: 600; color: #00b42a; }
  .lite-exporter-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-fp-tag { font-size: 10px; font-family: monospace; color: #165dff; background: #e8f3ff; padding: 2px 6px; border-radius: 3px; }
  .lite-exporter-body { padding: 12px 14px; }
  .lite-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
  .lite-meta-item { display: flex; flex-direction: column; gap: 2px; }
  .lite-meta-label { font-size: 10px; color: #86909c; }
  .lite-meta-val { font-size: 11px; font-weight: 500; color: #1d2129; }
  .font-mono { font-family: monospace; }
  .lite-exporter-watermark-note {
    background: #f2f3f5;
    padding: 8px 10px;
    border-radius: 4px;
    font-size: 10px;
    color: #4e5969;
    border-left: 3px solid #165dff;
  }
</style>
