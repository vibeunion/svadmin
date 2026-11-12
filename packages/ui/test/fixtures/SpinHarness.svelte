<script lang="ts">
  import Spin from "../../src/components/Spin.svelte";

  let {
    loading = true,
    tip = "",
  }: {
    loading?: boolean;
    tip?: string;
  } = $props();
</script>

<Spin {loading} {tip}>
  <div data-testid="content">Card Content</div>
</Spin>
