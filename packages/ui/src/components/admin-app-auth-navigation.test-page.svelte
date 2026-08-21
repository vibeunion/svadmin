<script lang="ts">
  import { onMount } from 'svelte';

  let { resourceName }: { resourceName: string } = $props();

  onMount(() => {
    window.dispatchEvent(new CustomEvent('svadmin:test-page-mounted'));
  });
</script>

<section aria-label="Posts page" data-resource={resourceName}>Posts page</section>
