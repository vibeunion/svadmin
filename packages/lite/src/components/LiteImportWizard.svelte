<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    resourceName: string;
    fields?: FieldDefinition[];
    action?: string;
    method?: 'POST' | 'post';
    submitText?: string;
  }

  let {
    resourceName,
    fields = [],
    action = '',
    method = 'POST',
    submitText = 'Upload & Import CSV',
  }: Props = $props();
</script>

<div class="lite-import-wizard lite-form-group">
  <div class="lite-import-title">
    <strong>📥 Import {resourceName}</strong>
  </div>
  <form {action} {method} enctype="multipart/form-data" class="lite-import-form">
    <div class="lite-file-row">
      <label for="import_file" class="lite-label">Select CSV / JSON file:</label>
      <input type="file" id="import_file" name="file" accept=".csv,.json" class="lite-input" required />
    </div>

    {#if fields.length > 0}
      <div class="lite-field-mapping-hints">
        <span class="lite-hint-title">Target Schema Fields:</span>
        <div class="lite-field-tags">
          {#each fields as field (field.key)}
            <span class="lite-badge">{field.label} ({field.key})</span>
          {/each}
        </div>
      </div>
    {/if}

    <div class="lite-import-actions">
      <button type="submit" class="lite-btn lite-btn-primary">
        {submitText}
      </button>
    </div>
  </form>
</div>

<style>
  .lite-import-wizard {
    padding: 12px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    margin-bottom: 16px;
  }
  .lite-import-title {
    font-size: 13px;
    color: #334155;
    margin-bottom: 8px;
  }
  .lite-file-row {
    margin-bottom: 10px;
  }
  .lite-label {
    display: block;
    font-size: 12px;
    color: #475569;
    margin-bottom: 4px;
  }
  .lite-field-mapping-hints {
    margin-bottom: 12px;
    font-size: 11px;
    color: #64748b;
  }
  .lite-hint-title {
    display: block;
    margin-bottom: 4px;
    font-weight: 600;
  }
  .lite-field-tags {
    display: flex;
    flex-wrap: wrap;
  }
  .lite-badge {
    display: inline-block;
    background: #e2e8f0;
    color: #334155;
    padding: 2px 6px;
    border-radius: 3px;
    margin-right: 6px;
    margin-bottom: 4px;
    font-size: 11px;
  }
  .lite-import-actions {
    margin-top: 8px;
  }
</style>
