<script lang="ts">
  interface Props {
    imageUrl: string;
    aspectRatio?: number;
    action?: string;
    method?: 'get' | 'post' | 'dialog' | 'GET' | 'POST' | 'DIALOG' | null;
  }

  let {
    imageUrl,
    aspectRatio = 1,
    action = '',
    method = 'POST',
  }: Props = $props();
</script>

<div class="lite-cropper-card">
  <div class="lite-cropper-header">
    <strong>Image Crop (Aspect Ratio: {aspectRatio}:1)</strong>
  </div>

  <div class="lite-cropper-preview">
    <img src={imageUrl} alt="Source Preview" class="lite-cropper-img" />
  </div>

  <form {action} {method} class="lite-cropper-form">
    <input type="hidden" name="imageUrl" value={imageUrl} />
    <input type="hidden" name="aspectRatio" value={aspectRatio} />

    <div class="lite-cropper-row">
      <label for="lite_crop_scale_input" class="lite-label">Scale Factor:</label>
      <select id="lite_crop_scale_input" name="zoom" class="lite-select" style="width: 100px;">
        <option value="1">100%</option>
        <option value="1.2">120%</option>
        <option value="1.5">150%</option>
        <option value="2">200%</option>
      </select>
    </div>

    <div class="lite-cropper-footer">
      <button type="submit" class="lite-btn lite-btn-primary lite-btn-sm">
        Save Image
      </button>
    </div>
  </form>
</div>

<style>
  .lite-cropper-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 16px;
    max-width: 480px;
  }
  .lite-cropper-header {
    padding-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 12px;
    font-size: 13px;
  }
  .lite-cropper-preview {
    text-align: center;
    background: #f1f5f9;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 12px;
  }
  .lite-cropper-img {
    max-width: 100%;
    max-height: 200px;
  }
  .lite-cropper-row {
    margin-bottom: 12px;
  }
  .lite-cropper-footer {
    display: flex;
    justify-content: flex-end;
  }
</style>
