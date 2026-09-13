<script lang="ts">
  import type { Snippet } from 'svelte';
  type Props = { children?: Snippet; class?: string };
  let { children, class: className = '' }: Props = $props();
</script>
<div class="mt-2 flex items-center gap-2 text-xs svadmin-ai__muted {className}">{@render children?.()}</div>
