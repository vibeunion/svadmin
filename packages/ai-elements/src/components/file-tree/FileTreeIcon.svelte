<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
</script>
<span {...rest} class={cn('svadmin-ai-file-tree-part__icon', className)} aria-hidden="true" data-slot="file-tree-icon">{@render children?.()}</span>
<style>.svadmin-ai-file-tree-part__icon { display: inline-flex; width: 1.1rem; flex: none; align-items: center; justify-content: center; color: var(--muted-foreground, currentColor); }</style>
