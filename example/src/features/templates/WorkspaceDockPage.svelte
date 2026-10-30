<script lang="ts">
  import type { Component } from 'svelte';
  import { Button } from '@svadmin/ui';
  import { DockWorkspace } from '@svadmin/dock';
  import DockPanelContent from './DockPanelContent.svelte';

  const panelComponent = DockPanelContent as unknown as Component<Record<string, unknown>>;

  const panels = [
    { id: 'overview', title: 'Overview', component: panelComponent, props: { kind: 'overview' } },
    { id: 'resources', title: 'Resources', component: panelComponent, props: { kind: 'resources' }, referencePanel: 'overview' },
    { id: 'latency', title: 'Latency distribution', component: panelComponent, props: { kind: 'latency' }, referencePanel: 'resources', direction: 'below' as const },
    { id: 'topology', title: 'Service topology', component: panelComponent, props: { kind: 'topology' }, referencePanel: 'latency', direction: 'within' as const },
  ];

  let saved = $state(false);

  function resetLayout() {
    window.localStorage.removeItem('svadmin:workspace-dock-demo');
    window.location.reload();
  }
</script>

<DockWorkspace
  title="Operations workspace"
  description="Drag tabs to dock panels. Layout changes are restored automatically."
  storageKey="svadmin:workspace-dock-demo"
  {panels}
  onlayout={() => { saved = true; }}
>
  {#snippet actions()}
    <Button variant="outline" size="sm" onclick={resetLayout}>Reset layout</Button>
    <Button size="sm" onclick={() => (saved = false)}>{saved ? 'Layout saved' : 'Auto-saved'}</Button>
  {/snippet}
</DockWorkspace>
