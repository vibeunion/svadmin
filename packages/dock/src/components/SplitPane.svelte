<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Pane, PaneGroup, PaneResizer, type PaneGroupAPI } from 'paneforge';
  import { cn } from '../utils.js';
  import type { SplitPaneConfig } from './split-pane.js';

  interface Props {
    panes: SplitPaneConfig[];
    direction?: 'horizontal' | 'vertical';
    autoSaveId?: string;
    keyboardResizeBy?: number;
    resizerLabel?: string;
    class?: string;
    children: Snippet<[SplitPaneConfig, number]>;
    onlayout?: (layout: number[]) => void;
    onready?: (api: PaneGroupAPI) => void;
  }

  let {
    panes,
    direction = 'horizontal',
    autoSaveId,
    keyboardResizeBy = 10,
    resizerLabel = 'Resize panes',
    class: className,
    children,
    onlayout,
    onready,
  }: Props = $props();

  let group = $state<PaneGroupAPI | null>(null);

  $effect(() => {
    if (group) onready?.(group);
  });
</script>

<div class={cn('svadmin-split-pane', className)} data-direction={direction}>
  <PaneGroup
    bind:this={group}
    {direction}
    {...(autoSaveId === undefined ? {} : { autoSaveId })}
    {keyboardResizeBy}
    {...(onlayout === undefined ? {} : { onLayoutChange: onlayout })}
  >
    {#each panes as pane, index (pane.id)}
      {#if index > 0}
        <PaneResizer class="svadmin-split-pane__resizer" aria-label={resizerLabel} />
      {/if}
      <Pane
        {...(pane.defaultSize === undefined ? {} : { defaultSize: pane.defaultSize })}
        {...(pane.minSize === undefined ? {} : { minSize: pane.minSize })}
        {...(pane.maxSize === undefined ? {} : { maxSize: pane.maxSize })}
        {...(pane.collapsible === undefined ? {} : { collapsible: pane.collapsible })}
        {...(pane.collapsedSize === undefined ? {} : { collapsedSize: pane.collapsedSize })}
      >
        {@render children(pane, index)}
      </Pane>
    {/each}
  </PaneGroup>
</div>

<style>
  .svadmin-split-pane {
    display: flex;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
  }
  .svadmin-split-pane :global([data-pane-group]) {
    width: 100%;
    height: 100%;
  }
  .svadmin-split-pane :global(.svadmin-split-pane__resizer) {
    position: relative;
    flex: 0 0 auto;
    background: var(--border);
    transition: background-color var(--svadmin-motion-fast, 120ms) ease;
  }
  .svadmin-split-pane[data-direction='horizontal'] :global(.svadmin-split-pane__resizer) {
    width: 1px;
    cursor: col-resize;
  }
  .svadmin-split-pane[data-direction='vertical'] :global(.svadmin-split-pane__resizer) {
    height: 1px;
    cursor: row-resize;
  }
  .svadmin-split-pane :global(.svadmin-split-pane__resizer:hover),
  .svadmin-split-pane :global(.svadmin-split-pane__resizer[data-active]) {
    background: var(--primary);
  }
  .svadmin-split-pane :global(.svadmin-split-pane__resizer:focus-visible) {
    outline: 2px solid var(--ring);
    outline-offset: 1px;
  }
</style>
