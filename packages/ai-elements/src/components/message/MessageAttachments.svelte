<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  export interface MessageAttachmentsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> {
    class?: string;
    children?: Snippet;
  }
</script>

<script lang="ts">
  import { cn } from '../../utils.js';

  let { class: className = '', children, ...rest }: MessageAttachmentsProps = $props();
</script>

{#if children}
  <div {...rest} class={cn('svadmin-ai-message-attachments', className)} data-slot="message-attachments">
    {@render children()}
  </div>
{/if}

<style>
  .svadmin-ai-message-attachments { display: flex; width: fit-content; max-width: 100%; flex-wrap: wrap; align-items: flex-start; justify-content: flex-end; gap: .5rem; margin-inline-start: auto; }
</style>
