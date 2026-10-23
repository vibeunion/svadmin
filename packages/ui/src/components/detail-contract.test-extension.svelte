<script lang="ts">
  import { onMount } from 'svelte';
  import { detailExtensionEvents } from './detail-contract.test-extension-state.js';

  let { recordId }: { recordId: string | number | null | undefined } = $props();
  let operation = $state<'idle' | 'active'>('idle');

  onMount(() => {
    detailExtensionEvents.push({ type: 'mount', recordId });
    return () => detailExtensionEvents.push({ type: 'destroy', recordId });
  });
</script>

<div data-testid="detail-extension-probe" data-record-id={recordId ?? ''} data-operation={operation}>
  <span data-testid="detail-extension-state">{operation}</span>
  <button type="button" onclick={() => operation = 'active'}>begin extension operation</button>
</div>
