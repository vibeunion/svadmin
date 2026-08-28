<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    direction?: 'horizontal' | 'vertical';
    pane1?: Snippet;
    pane2?: Snippet;
  }

  let {
    direction = 'horizontal',
    pane1,
    pane2,
  }: Props = $props();
</script>

<div class="lite-split-layout lite-split-{direction}">
  <div class="lite-split-pane-1">
    {#if pane1}
      {@render pane1()}
    {/if}
  </div>

  <div class="lite-split-divider"></div>

  <div class="lite-split-pane-2">
    {#if pane2}
      {@render pane2()}
    {/if}
  </div>
</div>

<style>
  .lite-split-layout {
    display: flex;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    margin-bottom: 16px;
    min-height: 300px;
  }
  .lite-split-horizontal {
    flex-direction: row;
  }
  .lite-split-vertical {
    flex-direction: column;
  }
  .lite-split-pane-1 {
    flex: 0 0 35%;
    padding: 12px;
    overflow-y: auto;
  }
  .lite-split-pane-2 {
    flex: 1 1 auto;
    padding: 12px;
    overflow-y: auto;
  }
  .lite-split-divider {
    background: #e2e8f0;
    width: 2px;
  }
  .lite-split-vertical .lite-split-divider {
    width: 100%;
    height: 2px;
  }
</style>
