<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    hasChanges?: boolean;
    message?: string;
    class?: string;
    children?: Snippet;
  }

  let {
    hasChanges = false,
    message = 'You have unsaved changes that may be lost.',
    class: className = '',
    children,
  }: Props = $props();
</script>

<div
  class="lite-unsaved-guard {className}"
  data-svadmin-component="LiteUnsavedChangesGuard"
  data-dirty={hasChanges ? 'true' : 'false'}
>
  {#if hasChanges}
    <aside class="lite-unsaved-banner" role="status">
      <span class="lite-unsaved-icon">⚠️</span>
      <span class="lite-unsaved-text">{message}</span>
    </aside>
  {/if}

  <div class="lite-unsaved-content">
    {#if children}{@render children()}{/if}
  </div>
</div>

<style>
  .lite-unsaved-guard { display: block; }
  .lite-unsaved-banner {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: #fff7e8;
    border: 1px solid #ffd591;
    border-radius: 6px;
    margin-bottom: 12px;
    font-size: 13px;
    color: #d46b08;
  }
  .lite-unsaved-banner > * + * { margin-left: 8px; }
  .lite-unsaved-icon { font-size: 14px; }
  .lite-unsaved-text { font-weight: 500; }
  .lite-unsaved-content { position: relative; }
</style>
