<script lang="ts">
  import Input from "../../src/components/ui/input/input.svelte";

  let {
    value = $bindable(""),
    allowClear = false,
  }: {
    value?: string;
    allowClear?: boolean;
  } = $props();
</script>

<Input bind:value {allowClear}>
  {#snippet prefix()}
    <span>@</span>
  {/snippet}
  {#snippet suffix()}
    <span>.com</span>
  {/snippet}
</Input>
