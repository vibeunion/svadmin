<script lang="ts">
  interface Props {
    title?: string;
    acceptedFormats?: string[];
    maxFileSizeMb?: number;
    sampleTemplateUrl?: string;
    class?: string;
  }

  let {
    title = '批量数据上传与导入',
    acceptedFormats = ['.csv', '.xlsx', '.json'],
    maxFileSizeMb = 50,
    sampleTemplateUrl = '#',
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-import-dropzone {className}"
  data-svadmin-component="LiteDataImportDropzone"
  role="region"
  aria-label="Data Import Dropzone"
>
  <header class="lite-dropzone-header">
    <h4 class="lite-dropzone-title">{title}</h4>
    <a href={sampleTemplateUrl} class="lite-template-link">下载标准模板文件</a>
  </header>

  <div class="lite-dropzone-body">
    <form class="lite-upload-form" method="POST" enctype="multipart/form-data">
      <div class="lite-drop-area">
        <div class="lite-drop-icon">📁</div>
        <div class="lite-drop-text">选择或拖拽导入数据文件至此</div>
        <div class="lite-drop-hint">支持格式: {acceptedFormats.join('、')}，单个文件上限 {maxFileSizeMb}MB</div>
        <div class="lite-native-file-input">
          <input type="file" name="import_file" accept={acceptedFormats.join(',')} />
        </div>
      </div>
      <div class="lite-form-actions">
        <button type="submit" class="lite-submit-btn">开始解析导入</button>
      </div>
    </form>
  </div>
</div>

<style>
  .lite-import-dropzone {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-dropzone-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-dropzone-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-template-link { font-size: 11px; color: #165dff; text-decoration: none; font-weight: 500; }
  .lite-template-link:hover { text-decoration: underline; }
  .lite-dropzone-body { padding: 14px; }
  .lite-drop-area {
    border: 2px dashed #c9cdd4;
    border-radius: 6px;
    padding: 24px;
    text-align: center;
    background: #fafbfc;
  }
  .lite-drop-icon { font-size: 24px; margin-bottom: 8px; }
  .lite-drop-text { font-size: 13px; font-weight: 600; color: #1d2129; margin-bottom: 4px; }
  .lite-drop-hint { font-size: 11px; color: #86909c; margin-bottom: 12px; }
  .lite-native-file-input input { font-size: 11px; }
  .lite-form-actions { margin-top: 12px; display: flex; justify-content: flex-end; }
  .lite-submit-btn {
    background: #165dff;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    padding: 6px 14px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
  }
</style>
