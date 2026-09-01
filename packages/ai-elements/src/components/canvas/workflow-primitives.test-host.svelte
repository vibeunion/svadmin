<script lang="ts">
  import type { Edge, Node, NodeTypes } from '@xyflow/svelte';
  import Canvas from './Canvas.svelte';
  import Controls from '../controls/Controls.svelte';
  import Panel from '../panel/Panel.svelte';
  import WorkflowNode from './WorkflowNode.test-host.svelte';

  let nodes = $state<Node[]>([
    {
      id: 'workflow-node',
      type: 'workflow',
      position: { x: 24, y: 24 },
      data: { title: 'Review request', description: 'Check generated output' },
      selected: true,
    },
  ]);
  let edges = $state<Edge[]>([]);
  const nodeTypes: NodeTypes = { workflow: WorkflowNode };
</script>

<div style="width: 640px; height: 360px">
  <Canvas bind:nodes bind:edges {nodeTypes}>
    <Controls showLock={false} />
    <Panel position="top-right">Workflow panel</Panel>
  </Canvas>
</div>
