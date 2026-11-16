<script lang="ts">
  import Space from "../../src/components/Space.svelte";
</script>

<Space>
  {#snippet split()}
    <span data-split="true">|</span>
  {/snippet}
  <span>Item 1</span>
  <span>Item 2</span>
</Space>
