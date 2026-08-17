<script lang="ts">
  import { onMount } from 'svelte';
  import { useSvelteFlow } from '@xyflow/svelte';
  import type { FlowCanvasApi } from '../types.js';

  let { onready }: { onready: (api: FlowCanvasApi) => void } = $props();

  const instance = useSvelteFlow();

  onMount(() => {
    onready({
      fitView: () => instance.fitView(),
      screenToFlowPosition: instance.screenToFlowPosition,
    });
  });
</script>
