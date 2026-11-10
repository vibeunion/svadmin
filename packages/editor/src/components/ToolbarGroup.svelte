<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: {
    children: Snippet;
  } = $props();
</script>

<div class="svadmin-toolbar-group">
  {@render children()}
</div>
