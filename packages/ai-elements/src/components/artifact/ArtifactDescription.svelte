<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  interface Props extends Omit<HTMLAttributes<HTMLParagraphElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
</script>

<p {...rest} class={cn('svadmin-ai-artifact-part__description', className)} data-slot="artifact-description">{@render children?.()}</p>

<style>.svadmin-ai-artifact-part__description { margin: 0; color: var(--muted-foreground, currentColor); font-size: .8rem; line-height: 1.45; }</style>
