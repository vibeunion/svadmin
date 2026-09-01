<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { Paperclip } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
</script>
<span {...rest} class={cn('svadmin-ai-queue-part__file', className)} data-slot="queue-item-file"><Paperclip size={12} aria-hidden="true" /><span>{@render children?.()}</span></span>
<style>.svadmin-ai-queue-part__file { display: inline-flex; max-width: 12rem; align-items: center; gap: .3rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .4rem); padding: .3rem .45rem; background: var(--muted, transparent); font-size: .72rem; }.svadmin-ai-queue-part__file > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }</style>
