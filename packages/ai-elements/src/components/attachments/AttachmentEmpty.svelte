<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  export type AttachmentEmptyProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & { class?: string; children?: Snippet };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  let { class: className = '', children, ...rest }: AttachmentEmptyProps = $props();
</script>

<div {...rest} class={cn('svadmin-ai-attachment-empty', className)} data-slot="attachment-empty">
  {#if children}{@render children()}{:else}No attachments{/if}
</div>

<style>
  .svadmin-ai-attachment-empty { display: flex; width: 100%; align-items: center; justify-content: center; padding: 1rem; color: var(--muted-foreground, currentColor); font-size: .875rem; }
</style>
