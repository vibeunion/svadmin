<script lang="ts">import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; } let { class: className = '', children, ...rest }: Props = $props();</script>
<div {...rest} class={cn('svadmin-ai-tests-part__content', className)} data-slot="test-results-content">{@render children?.()}</div>
<style>.svadmin-ai-tests-part__content { display: grid; gap: .5rem; padding: .75rem; }</style>
