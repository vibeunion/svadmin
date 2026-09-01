<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { PromptInputFile } from './context.svelte.js';
  export interface PromptInputAttachmentsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> {
    class?: string;
    children?: Snippet<[PromptInputFile]>;
  }
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import { usePromptInputAttachments } from './context.svelte.js';
  let { class: className = '', children, ...rest }: PromptInputAttachmentsProps = $props();
  const context = usePromptInputAttachments();
</script>

<div {...rest} class={cn('flex flex-wrap gap-2 overflow-hidden', className)} data-slot="prompt-input-attachments" aria-live="polite">
  {#each context.files as file (file.id)}
    {@render children?.(file)}
  {/each}
</div>
