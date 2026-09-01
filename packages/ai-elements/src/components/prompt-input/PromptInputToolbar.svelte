<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  export type PromptInputToolbarProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & { class?: string; children?: Snippet };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  let { class: className = '', children, ...rest }: PromptInputToolbarProps = $props();
</script>

<div {...rest} class={cn('flex items-center justify-between gap-1 p-1', className)} data-slot="prompt-input-toolbar">
  {@render children?.()}
</div>
