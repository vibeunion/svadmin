<script lang="ts">
  interface LiteMediaItem {
    id: string;
    name: string;
    url: string;
    size?: string;
    category?: string;
  }

  interface Props {
    title?: string;
    multiple?: boolean;
    mediaItems?: LiteMediaItem[];
    action?: string;
    method?: 'get' | 'post' | 'dialog' | 'GET' | 'POST' | 'DIALOG' | null;
  }

  let {
    title = 'Media Library',
    multiple = false,
    mediaItems = [],
    action = '',
    method = 'POST',
  }: Props = $props();
</script>

<div class="lite-media-library-card">
  <div class="lite-media-header">
    <strong>{title}</strong>
  </div>

  <form {action} {method} enctype="multipart/form-data">
    <!-- Upload Section -->
    <div class="lite-media-upload-row">
      <label for="media_upload_input" class="lite-label">Upload New Media:</label>
      <input id="media_upload_input" type="file" name="files" multiple={multiple} class="lite-file-input" />
      <button type="submit" name="_media_action" value="upload" class="lite-btn lite-btn-sm lite-btn-outline" style="margin-left: 8px;">
        Upload File
      </button>
    </div>

    <!-- Media Table List -->
    <table class="lite-table">
      <thead>
        <tr>
          <th style="width: 40px;">Select</th>
          <th>File Name</th>
          <th>Category</th>
          <th>Size</th>
          <th>Preview</th>
        </tr>
      </thead>
      <tbody>
        {#each mediaItems as item (item.id)}
          <tr>
            <td style="text-align: center;">
              {#if multiple}
                <input type="checkbox" name="selectedUrls" value={item.url} />
              {:else}
                <input type="radio" name="selectedUrls" value={item.url} />
              {/if}
            </td>
            <td><strong>{item.name}</strong></td>
            <td>{item.category ?? 'General'}</td>
            <td>{item.size ?? '—'}</td>
            <td><a href={item.url} target="_blank" rel="noreferrer" class="lite-link">View</a></td>
          </tr>
        {/each}
        {#if mediaItems.length === 0}
          <tr>
            <td colspan="5" style="text-align: center; color: #94a3b8; padding: 24px;">No media files available</td>
          </tr>
        {/if}
      </tbody>
    </table>

    <div class="lite-media-footer">
      <button type="submit" name="_media_action" value="select" class="lite-btn lite-btn-primary lite-btn-sm">
        Confirm Selection
      </button>
    </div>
  </form>
</div>

<style>
  .lite-media-library-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 16px;
  }
  .lite-media-header {
    padding-bottom: 10px;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 12px;
    font-size: 14px;
  }
  .lite-media-upload-row {
    margin-bottom: 12px;
    padding: 8px;
    background: #f8fafc;
    border-radius: 4px;
  }
  .lite-media-footer {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
  }
</style>
