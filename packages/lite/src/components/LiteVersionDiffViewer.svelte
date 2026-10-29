<script lang="ts">
  interface Props {
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    oldTitle?: string;
    newTitle?: string;
    fieldLabels?: Record<string, string>;
  }

  let {
    oldValue = {},
    newValue = {},
    oldTitle = 'Previous Version',
    newTitle = 'Current Version',
    fieldLabels = {},
  }: Props = $props();

  const allKeys = $derived(
    Array.from(new Set([...Object.keys(oldValue || {}), ...Object.keys(newValue || {})]))
  );

  function getStatus(key: string): 'added' | 'removed' | 'modified' | 'unchanged' {
    const hasOld = key in oldValue && oldValue[key] !== undefined;
    const hasNew = key in newValue && newValue[key] !== undefined;
    if (!hasOld && hasNew) return 'added';
    if (hasOld && !hasNew) return 'removed';
    if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) return 'modified';
    return 'unchanged';
  }

  function formatVal(val: unknown): string {
    if (val === undefined || val === null) return '—';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }
</script>

<div class="lite-diff-viewer">
  <div class="lite-diff-header">
    <strong>Record Comparison</strong>
  </div>

  <table class="lite-table lite-diff-table">
    <thead>
      <tr>
        <th style="width: 25%;">Field</th>
        <th style="width: 37.5%;">{oldTitle}</th>
        <th style="width: 37.5%;">{newTitle}</th>
      </tr>
    </thead>
    <tbody>
      {#each allKeys as key (key)}
        {@const status = getStatus(key)}
        <tr class="lite-diff-row lite-diff-{status}">
          <td>
            <strong>{fieldLabels[key] || key}</strong>
            {#if status !== 'unchanged'}
              <span class="lite-badge lite-badge-{status}">[{status}]</span>
            {/if}
          </td>
          <td class="lite-diff-old">
            {#if status === 'removed'}
              <del>{formatVal(oldValue[key])}</del>
            {:else}
              {formatVal(oldValue[key])}
            {/if}
          </td>
          <td class="lite-diff-new">
            {#if status === 'added'}
              <ins>{formatVal(newValue[key])}</ins>
            {:else if status === 'modified'}
              <strong>{formatVal(newValue[key])}</strong>
            {:else}
              {formatVal(newValue[key])}
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .lite-diff-viewer {
    background: #ffffff;
    border: 1px solid #E5E6EB;
    border-radius: 6px;
    margin-bottom: 16px;
  }
  .lite-diff-header {
    padding: 10px 12px;
    background: #F7F8FA;
    border-bottom: 1px solid #E5E6EB;
    font-size: 13px;
  }
  .lite-diff-table {
    width: 100%;
    margin-bottom: 0;
    font-size: 12px;
  }
  .lite-diff-table th {
    background: #F2F3F5;
    padding: 8px 12px;
    text-align: left;
  }
  .lite-diff-table td {
    padding: 8px 12px;
    border-top: 1px solid #E5E6EB;
  }
  .lite-diff-added {
    background: #E8FFEA;
  }
  .lite-diff-removed {
    background: #FFECE8;
  }
  .lite-diff-modified {
    background: #FFF7E8;
  }
  .lite-diff-old del {
    color: #F53F3F;
  }
  .lite-diff-new ins {
    color: #00B42A;
    text-decoration: none;
  }
  .lite-diff-new strong {
    color: #FF7D00;
  }
</style>
