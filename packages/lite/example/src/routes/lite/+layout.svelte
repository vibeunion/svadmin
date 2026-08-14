<script lang="ts">
  import type { Snippet } from 'svelte';
  import '@svadmin/lite/lite.css';

  let { children }: { children: Snippet } = $props();
</script>

{@render children()}
