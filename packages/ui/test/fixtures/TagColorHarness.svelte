<script lang="ts">
  import Tag from "../../src/components/Tag.svelte";

  let {
    color = "blue",
    bordered = true,
  }: {
    color?: string;
    bordered?: boolean;
  } = $props();
</script>

<Tag {color} {bordered}>
  {#snippet icon()}
    <span>★</span>
  {/snippet}
  Featured
</Tag>
