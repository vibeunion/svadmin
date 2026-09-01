<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { FileText } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
</script>
<div {...rest} class={cn('svadmin-ai-task-part__file', className)} data-slot="task-item-file"><FileText size={13} aria-hidden="true" />{@render children?.()}</div>
<style>.svadmin-ai-task-part__file { display: inline-flex; align-items: center; gap: .35rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); padding: .2rem .4rem; color: var(--muted-foreground, currentColor); font-size: .75rem; }</style>
