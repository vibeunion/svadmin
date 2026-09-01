<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  interface Props extends Omit<HTMLAttributes<HTMLParagraphElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
</script>

<p {...rest} class={cn('svadmin-ai-artifact-part__title', className)} data-slot="artifact-title">{@render children?.()}</p>

<style>.svadmin-ai-artifact-part__title { margin: 0; font-size: .875rem; font-weight: 650; color: var(--foreground, currentColor); }</style>
