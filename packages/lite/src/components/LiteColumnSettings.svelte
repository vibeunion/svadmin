<script lang="ts">
  export interface LiteColumnOption {
    key: string;
    label: string;
    visible: boolean;
  }

  interface Props {
    columns: LiteColumnOption[];
    action?: string;
    method?: 'GET' | 'POST' | 'get' | 'post';
    title?: string;
    submitText?: string;
  }

  let {
    columns = [],
    action = '',
    method = 'GET',
    title = 'Column Visibility',
    submitText = 'Apply',
  }: Props = $props();
</script>

<div class="lite-column-settings lite-form-group">
  <div class="lite-column-settings-title">
    <strong>⚙ {title}</strong>
  </div>
  <form {action} {method} class="lite-column-settings-form">
    <div class="lite-column-options">
      {#each columns as col (col.key)}
        <label class="lite-column-option">
          <input
            type="checkbox"
            name="columns"
            value={col.key}
            checked={col.visible}
          />
          <span>{col.label}</span>
        </label>
      {/each}
    </div>
    <div class="lite-column-actions">
      <button type="submit" class="lite-btn lite-btn-sm lite-btn-primary">
        {submitText}
      </button>
    </div>
  </form>
</div>

<style>
  .lite-column-settings {
    margin-bottom: 12px;
    padding: 8px 12px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
  }
  .lite-column-settings-title {
    font-size: 12px;
    color: #475569;
    margin-bottom: 6px;
  }
  .lite-column-options {
    display: flex;
    flex-wrap: wrap;
  }
  .lite-column-option {
    display: inline-flex;
    align-items: center;
    margin-right: 12px;
    margin-bottom: 4px;
    font-size: 12px;
    cursor: pointer;
  }
  .lite-column-option input {
    margin-right: 4px;
  }
  .lite-column-actions {
    margin-top: 6px;
  }
</style>
