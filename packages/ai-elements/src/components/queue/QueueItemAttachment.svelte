<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
</script>
<div {...rest} class={cn('svadmin-ai-queue-part__attachments', className)} data-slot="queue-item-attachment">{@render children?.()}</div>
<style>.svadmin-ai-queue-part__attachments { display: flex; flex-wrap: wrap; gap: .5rem; padding-left: 1.35rem; }</style>
