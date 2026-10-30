<script lang="ts">
  import DockLayout from './DockLayout.svelte';
  import DockPanelProbe from './DockPanelProbe.svelte';
  import type { DockPanel } from './dock-layout.js';

  const panels: DockPanel[] = [
    { id: 'one', title: 'One', component: DockPanelProbe },
    { id: 'two', title: 'Two', component: DockPanelProbe, referencePanel: 'one', direction: 'right' },
  ];
</script>

<DockLayout {panels} />
