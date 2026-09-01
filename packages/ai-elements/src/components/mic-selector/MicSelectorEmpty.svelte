<script lang="ts">
  import type { Snippet } from 'svelte';
  type Props = { children?: Snippet };
  let { children }: Props = $props();
</script>

<p class="svadmin-ai__muted p-2 text-xs">{#if children}{@render children()}{:else}No microphone found.{/if}</p>
