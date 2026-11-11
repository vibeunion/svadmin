<script lang="ts">
  interface ExportCol {
    key: string;
    label: string;
  }

  interface Props {
    open?: boolean;
    action?: string;
    resourceName?: string;
    columns?: ExportCol[];
    class?: string;
  }

  let {
    open = true,
    action = '/api/export',
    resourceName = 'Records',
    columns = [],
    class: className = '',
  }: Props = $props();
</script>

{#if open}
  <section
    class="lite-export-modal {className}"
    data-svadmin-component="LiteAsyncExportModal"
    aria-label="Export {resourceName}"
  >
    <header class="lite-export-header">
      <h3 class="lite-export-title">Export {resourceName}</h3>
    </header>

    <form method="POST" action={action} class="lite-export-form">
      <div class="lite-export-group">
        <label for="lite-export-filename">File Name</label>
        <input type="text" id="lite-export-filename" name="filename" value="{resourceName}-Export" />
      </div>

      <div class="lite-export-group">
        <span class="lite-export-label">Format</span>
        <div class="lite-export-radios">
          <label><input type="radio" name="format" value="xlsx" checked /> Excel (.xlsx)</label>
          <label><input type="radio" name="format" value="csv" /> CSV (.csv)</label>
          <label><input type="radio" name="format" value="json" /> JSON (.json)</label>
        </div>
      </div>

      {#if columns.length > 0}
        <div class="lite-export-group">
          <span class="lite-export-label">Columns</span>
          <div class="lite-export-columns">
            {#each columns as col (col.key)}
              <label class="lite-export-col-item">
                <input type="checkbox" name="columns" value={col.key} checked />
                <span>{col.label}</span>
              </label>
            {/each}
          </div>
        </div>
      {/if}

      <div class="lite-export-actions">
        <button type="submit" class="lite-export-submit">Start Export</button>
      </div>
    </form>
  </section>
{/if}

<style>
  .lite-export-modal {
    border: 1px solid #e5e6eb;
    border-radius: 8px;
    padding: 16px;
    background: #ffffff;
    max-width: 480px;
    box-sizing: border-box;
  }
  .lite-export-header { margin-bottom: 12px; }
  .lite-export-title { margin: 0; font-size: 15px; color: #1d2129; font-weight: 600; }
  .lite-export-group { margin-bottom: 12px; font-size: 13px; }
  .lite-export-group label, .lite-export-label { display: block; margin-bottom: 4px; font-weight: 500; color: #4e5969; }
  .lite-export-group input[type="text"] {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 10px;
    border: 1px solid #e5e6eb;
    border-radius: 4px;
  }
  .lite-export-radios { display: flex; margin-top: 4px; }
  .lite-export-radios > * + * { margin-left: 12px; }
  .lite-export-columns {
    display: flex;
    flex-wrap: wrap;
    max-height: 140px;
    overflow-y: auto;
    padding: 6px;
    background: #f7f8fa;
    border-radius: 4px;
  }
  .lite-export-col-item { display: flex; align-items: center; width: 50%; font-size: 12px; }
  .lite-export-col-item > * + * { margin-left: 6px; }
  .lite-export-actions { margin-top: 16px; display: flex; justify-content: flex-end; }
  .lite-export-submit {
    padding: 7px 16px;
    background: #165dff;
    color: #ffffff;
    border: 0;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }
</style>
