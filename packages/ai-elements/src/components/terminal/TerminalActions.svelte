<script lang="ts">import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; } let { class: className = '', children, ...rest }: Props = $props();</script>
<div {...rest} class={cn('svadmin-ai-terminal-part__actions', className)} data-slot="terminal-actions">{@render children?.()}</div>
<style>.svadmin-ai-terminal-part__actions { display: inline-flex; align-items: center; gap: .2rem; }</style>
