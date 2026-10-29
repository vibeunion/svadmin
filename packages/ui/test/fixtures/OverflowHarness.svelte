<script lang="ts">
  import Overflow from '../../src/components/Overflow.svelte';

  const items = ['Alpha', 'Beta', 'Gamma', 'Delta'];
</script>

<Overflow {items} max={2}>
  {#snippet children(item, index)}
    <span>{item}-{index}</span>
  {/snippet}
</Overflow>
