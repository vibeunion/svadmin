# @svadmin/flow

`@svadmin/flow` is an optional Svelte 5 node-canvas package for admin tools that need a draggable graph editor. It wraps the maintained MIT-licensed `@xyflow/svelte` runtime without adding it to `@svadmin/ui`, `@svadmin/core`, or applications that do not use a canvas.

It owns browser-side graph interaction only: drag, connect, pan, zoom, controls, minimap, and a plain-text template palette. It does **not** define workflow semantics, validate business rules, persist graphs, authorize edits, execute nodes, or integrate with any data provider. Hosts keep those decisions and must validate every saved graph on the server.

## Install

```bash
bun add @svadmin/flow svelte
```

Import the package CSS once in the route or layout that renders a canvas:

```ts
import '@svadmin/flow/flow.css';
```

## Minimal draggable canvas

```svelte
<script lang="ts">
  import { FlowCanvas, FlowPalette, type FlowEdge, type FlowNode, type FlowItemDropDetail } from '@svadmin/flow';
  import '@svadmin/flow/flow.css';

  let nodes = $state<FlowNode[]>([
    { id: 'start', type: 'input', position: { x: 80, y: 80 }, data: { label: 'Start' } },
  ]);
  let edges = $state<FlowEdge[]>([]);
  let sequence = 0;

  const palette = [
    { id: 'review', type: 'default', label: 'Review', data: { label: 'Review' } },
    { id: 'finish', type: 'output', label: 'Finish', data: { label: 'Finish' } },
  ];

  function addNode({ template, position }: FlowItemDropDetail) {
    sequence += 1;
    nodes = [...nodes, { id: `${template.id}-${sequence}`, type: template.type, position, data: template.data }];
  }
</script>

<div class="editor-layout">
  <FlowPalette items={palette} />
  <FlowCanvas bind:nodes bind:edges onitemdrop={addNode} showMiniMap />
</div>
```

`FlowCanvas` updates bound `nodes` and `edges` when users move, connect, select, or delete elements. `FlowPalette` puts an explicitly-scoped JSON payload on the browser drag operation; `onitemdrop` receives that palette template and flow-space coordinates. The host creates the node, so it can assign IDs, validate node types, apply permissions, and choose its persistence model.

The `onready` callback exposes `fitView()` and `screenToFlowPosition()`.
`fitView()` resolves to `false` for an empty canvas rather than waiting for
nodes to appear. Later calls use the current nodes.

## API

| Export | Purpose |
| --- | --- |
| `FlowCanvas` | Two-way-bound Svelte Flow canvas with optional background, controls, minimap, and palette-drop callback. |
| `FlowPalette` | Accessible text palette that supports click selection and browser drag. |
| `FlowNode`, `FlowEdge` | Svelte Flow node and edge type aliases. |
| `FlowPaletteItem`, `FlowItemDropDetail` | Typed host-owned palette and drop contracts. |
| `encodeFlowPaletteItem`, `decodeFlowPaletteItem`, `readFlowPaletteItem` | Small helpers for custom palette/drop integrations. |

## Boundaries

- This package is browser-oriented; SSR consumers should render it client-side only.
- Palette types and runtime validation share one schema. Data must contain only
  plain JSON objects, dense arrays, strings, finite numbers, booleans, and null.
  Unknown template properties, explicit undefined, cycles, accessors, symbols,
  custom instances, and serialization hooks are rejected. Encoding invalid input
  throws `TypeError`; decoding invalid payloads returns `null`.
- Palette validation checks the transport format, not host-specific business
  rules or authorization. Saved graphs still require server-side validation.
- `FlowCanvas` does not serialize or persist state. Save only a host-owned graph document after validating node, edge, tenancy, authorization, and version rules.
- Custom nodes and edges use the native `@xyflow/svelte` `nodeTypes` and `edgeTypes` props.
