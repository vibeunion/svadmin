<script lang="ts">
  import Space from "../../src/components/Space.svelte";
</script>

<Space>
  {#snippet children()}
    <span>Item 1</span>
    <span>Item 2</span>
  {/snippet}
</Space>
