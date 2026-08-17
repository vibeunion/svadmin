---
title: Flow canvas
description: Add an optional draggable node canvas without coupling it to svadmin core
---

`@svadmin/flow` is an optional browser package for Svelte 5 graph editors. It provides a Svelte Flow canvas and an accessible template palette, while keeping graph shape, authorization, persistence, and runtime semantics in the host application.

It does not add `@xyflow/svelte` to `@svadmin/core` or `@svadmin/ui`; install it only in an application that renders a node canvas.

```bash
bun add @svadmin/flow svelte
```

Import the package stylesheet once in the route or layout that renders a canvas:

```ts
import '@svadmin/flow/flow.css';
```

## Build a draggable editor

```svelte
<script lang="ts">
  import { FlowCanvas, FlowPalette, type FlowEdge, type FlowNode } from '@svadmin/flow';
  import '@svadmin/flow/flow.css';

  let nodes = $state<FlowNode[]>([
    { id: 'start', type: 'input', position: { x: 80, y: 80 }, data: { label: 'Start' } },
  ]);
  let edges = $state<FlowEdge[]>([]);
  let number = 0;

  const palette = [
    { id: 'review', type: 'default', label: 'Review', data: { label: 'Review' } },
    { id: 'finish', type: 'output', label: 'Finish', data: { label: 'Finish' } },
  ];

  function addNode({ template, position }) {
    number += 1;
    nodes = [...nodes, { id: `${template.id}-${number}`, type: template.type, position, data: template.data }];
  }
</script>

<div class="editor-layout">
  <FlowPalette items={palette} />
  <FlowCanvas bind:nodes bind:edges onitemdrop={addNode} showMiniMap />
</div>
```

`FlowPalette` sets a package-specific JSON drag payload. When it lands on `FlowCanvas`, `onitemdrop` receives the selected template plus coordinates in flow space. The host creates the node so it can allocate IDs, restrict available node types, and select the data model. The canvas keeps `nodes` and `edges` synchronized as users drag, connect, select, and delete elements.

## Public API

| Export | Purpose |
| --- | --- |
| `FlowCanvas` | Two-way-bound graph canvas with optional background, controls, minimap, and palette-drop callback. |
| `FlowPalette` | Text-only, keyboard-accessible palette supporting click selection and browser drag. |
| `FlowNode`, `FlowEdge` | Type aliases for Svelte Flow nodes and edges. |
| `FlowPaletteItem`, `FlowItemDropDetail` | Host-owned palette and drop contracts. |
| `encodeFlowPaletteItem`, `decodeFlowPaletteItem`, `readFlowPaletteItem` | Helpers for a custom palette or drop target. |

Pass native Svelte Flow `nodeTypes` and `edgeTypes` to `FlowCanvas` for trusted custom components. Use `onready` when a host toolbar needs `fitView()` or `screenToFlowPosition()`.

## Security and persistence boundary

- The palette payload is UI transport data, not a trust or permission boundary. Treat every saved graph as untrusted input and validate it on the server.
- This package never saves, publishes, runs, or authorizes a graph. Tenant isolation, versioning, audit trails, business transitions, and execution stay in the host's backend.
- Keep the package client-side. It is not an SSR graph renderer.
- Do not render node labels or template data as raw HTML. The built-in palette renders plain text only.
