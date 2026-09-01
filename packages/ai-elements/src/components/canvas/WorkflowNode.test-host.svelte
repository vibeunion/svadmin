<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import Node from '../node/Node.svelte';
  import NodeAction from '../node/NodeAction.svelte';
  import NodeContent from '../node/NodeContent.svelte';
  import NodeDescription from '../node/NodeDescription.svelte';
  import NodeFooter from '../node/NodeFooter.svelte';
  import NodeHeader from '../node/NodeHeader.svelte';
  import NodeTitle from '../node/NodeTitle.svelte';
  import Toolbar from '../toolbar/Toolbar.svelte';

  type Data = { title: string; description: string };
  let { data }: NodeProps & { data: Data } = $props();
</script>

<Node handles={{ target: true, source: true }}>
  <NodeHeader>
    <NodeTitle>{data.title}</NodeTitle>
    <NodeDescription>{data.description}</NodeDescription>
    <NodeAction><button type="button" aria-label="Node action">Edit</button></NodeAction>
  </NodeHeader>
  <NodeContent>Node content</NodeContent>
  <NodeFooter>Node footer</NodeFooter>
  <Toolbar isVisible={true}><button type="button">Run</button></Toolbar>
</Node>
