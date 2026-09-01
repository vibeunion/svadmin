<script lang="ts">import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; } let { class: className = '', children, ...rest }: Props = $props();</script>
<div {...rest} class={cn('svadmin-ai-schema-part__body', className)} data-slot="schema-display-body">{@render children?.()}</div>
<style>.svadmin-ai-schema-part__body > :global(* + *) { border-top: 1px solid var(--border, currentColor); }</style>
