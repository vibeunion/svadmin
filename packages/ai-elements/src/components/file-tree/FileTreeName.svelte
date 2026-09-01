<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
</script>
<span {...rest} class={cn('svadmin-ai-file-tree-part__name', className)} data-slot="file-tree-name">{@render children?.()}</span>
<style>.svadmin-ai-file-tree-part__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }</style>
