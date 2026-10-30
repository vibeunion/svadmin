# @svadmin/dock

Optional split-pane and dockable workspace components.

```bash
bun add @svadmin/dock paneforge
# full dockable workspace
bun add @svadmin/dock dockview
```

```svelte
<script lang="ts">
  import { SplitPane } from '@svadmin/dock';
</script>

<SplitPane panes={[{ id: 'left' }, { id: 'right' }]}>
  {#snippet children(pane)}
    <div>{pane.id}</div>
  {/snippet}
</SplitPane>
```

Use `DockLayout` when tabs, split groups, drag-and-drop docking and layout
serialization are required. Both engines are optional peer dependencies.
