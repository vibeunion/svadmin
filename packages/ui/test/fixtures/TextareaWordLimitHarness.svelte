<script lang="ts">
  import Textarea from "../../src/components/ui/textarea/textarea.svelte";

  let {
    value = $bindable(""),
    maxLength = 100,
    showWordLimit = true,
    allowClear = true,
  }: {
    value?: string;
    maxLength?: number;
    showWordLimit?: boolean;
    allowClear?: boolean;
  } = $props();
</script>

<Textarea bind:value {maxLength} {showWordLimit} {allowClear} />
