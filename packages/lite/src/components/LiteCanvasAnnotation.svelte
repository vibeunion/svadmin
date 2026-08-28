<script lang="ts">
  export interface AnnotationItem {
    id: string;
    type: string;
    text?: string;
    color?: string;
  }

  interface Props {
    imageUrl?: string;
    annotations?: AnnotationItem[];
    title?: string;
    formAction?: string;
    class?: string;
  }

  let {
    imageUrl = '',
    annotations = [],
    title = 'Image Annotation & Markings',
    formAction = '',
    class: className = '',
  }: Props = $props();
</script>

<div class="sv-lite-annotation-box {className}">
  <div class="sv-lite-anno-header">
    <strong>{title}</strong>
    <span class="sv-lite-anno-count">({annotations.length} markers)</span>
  </div>

  {#if imageUrl}
    <div class="sv-lite-anno-preview">
      <img src={imageUrl} alt="Annotation Target" class="sv-lite-anno-img" />
    </div>
  {/if}

  {#if annotations.length > 0}
    <div class="sv-lite-anno-list">
      <div class="sv-lite-list-title">Annotations:</div>
      {#each annotations as anno (anno.id)}
        <div class="sv-lite-anno-item">
          <span class="sv-lite-anno-badge">{anno.type}</span>
          <span class="sv-lite-anno-text">{anno.text ?? 'Defect / Mark'}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if formAction}
    <div class="sv-lite-anno-upload">
      <form method="POST" action={formAction} enctype="multipart/form-data">
        <input type="file" name="annotatedImage" accept="image/*" class="sv-lite-file-input" />
        <button type="submit" class="sv-lite-upload-btn">Upload Markup</button>
      </form>
    </div>
  {/if}
</div>

<style>
  .sv-lite-annotation-box {
    display: block;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px;
    background-color: #ffffff;
    font-size: 12px;
  }
  .sv-lite-anno-header {
    margin-bottom: 10px;
    font-size: 13px;
    color: #0f172a;
  }
  .sv-lite-anno-count {
    color: #64748b;
    font-size: 11px;
    margin-left: 6px;
  }
  .sv-lite-anno-preview {
    text-align: center;
    background-color: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 8px;
    margin-bottom: 10px;
  }
  .sv-lite-anno-img {
    max-width: 100%;
    max-height: 240px;
    vertical-align: middle;
  }
  .sv-lite-anno-list {
    margin-bottom: 10px;
    padding: 8px;
    background-color: #f8fafc;
    border-radius: 4px;
  }
  .sv-lite-list-title {
    font-weight: 600;
    color: #475569;
    margin-bottom: 6px;
  }
  .sv-lite-anno-item {
    margin-bottom: 4px;
  }
  .sv-lite-anno-badge {
    display: inline-block;
    padding: 1px 5px;
    background-color: #fee2e2;
    color: #991b1b;
    border-radius: 3px;
    font-size: 10px;
    text-transform: uppercase;
    margin-right: 6px;
  }
  .sv-lite-anno-text {
    color: #334155;
  }
  .sv-lite-anno-upload {
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
  }
  .sv-lite-file-input {
    font-size: 11px;
    margin-right: 8px;
  }
  .sv-lite-upload-btn {
    padding: 4px 10px;
    font-size: 11px;
    background-color: #4f46e5;
    color: #ffffff;
    border: none;
    border-radius: 3px;
    cursor: pointer;
  }
</style>
