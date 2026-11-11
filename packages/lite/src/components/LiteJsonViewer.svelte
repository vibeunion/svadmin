<script lang="ts">
  interface Props {
    data: unknown;
    initialDepth?: number;
    title?: string;
    class?: string;
  }

  let {
    data,
    initialDepth = 2,
    title,
    class: className = '',
  }: Props = $props();

  const formattedJson = $derived.by(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  });

  const itemCount = $derived.by(() => {
    if (typeof data === 'object' && data !== null) {
      return Array.isArray(data) ? `${data.length} items` : `${Object.keys(data).length} keys`;
    }
    return typeof data;
  });
</script>

<div
  class="lite-json-viewer {className}"
  data-svadmin-component="LiteJsonViewer"
  data-initial-depth={initialDepth}
  role="region"
  aria-label={title ?? 'JSON Viewer'}
>
  {#if title}
    <header class="lite-json-header">
      <h4 class="lite-json-title">{title}</h4>
      <span class="lite-json-meta">{itemCount}</span>
    </header>
  {/if}

  <div class="lite-json-body">
    <div class="lite-json-details">
      <div class="lite-json-summary">
        <span>Payload Tree ({itemCount})</span>
      </div>
      <pre class="lite-json-code"><code>{formattedJson}</code></pre>
    </div>
  </div>
</div>

<style>
  .lite-json-viewer {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #f7f8fa;
    font-family: monospace;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-json-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #e5e6eb;
    background: #ffffff;
  }
  .lite-json-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-json-meta { font-size: 11px; color: #86909c; }
  .lite-json-body { padding: 10px 12px; max-height: 400px; overflow: auto; }
  .lite-json-summary { cursor: pointer; color: #165dff; font-weight: 500; margin-bottom: 6px; outline: none; }
  .lite-json-code {
    margin: 0;
    padding: 8px;
    background: #ffffff;
    border: 1px solid #e5e6eb;
    border-radius: 4px;
    color: #1d2129;
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.5;
  }
</style>
