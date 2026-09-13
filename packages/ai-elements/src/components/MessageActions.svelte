<script lang="ts">
  import type { Snippet } from 'svelte';
  type Props = { children?: Snippet; class?: string };
  let { children, class: className = '' }: Props = $props();
</script>
<div class="mt-2 flex flex-wrap gap-2 {className}">{@render children?.()}</div>
