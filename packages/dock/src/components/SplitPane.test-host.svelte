<script lang="ts">
  import SplitPane from './SplitPane.svelte';
  import type { PaneGroupAPI } from 'paneforge';

  let { onready, onlayout }: { onready?: (api: PaneGroupAPI) => void; onlayout?: (layout: number[]) => void } = $props();
</script>

<SplitPane
  panes={[{ id: 'left', defaultSize: 30, minSize: 10 }, { id: 'right', defaultSize: 70 }]}
  direction="horizontal"
  {...(onready ? { onready } : {})}
  {...(onlayout ? { onlayout } : {})}
>
  {#snippet children(pane)}
    <div data-testid={`pane-${pane.id}`}>{pane.id}</div>
  {/snippet}
</SplitPane>
