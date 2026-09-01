<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  export type ModelSelectorGroupProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & { heading?: string; class?: string; children?: Snippet };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  let { heading, class: className = '', children, ...rest }: ModelSelectorGroupProps = $props();
  const id = $props.id();
</script>

<div {...rest} class={cn('svadmin-ai-model-selector-group', className)} data-slot="model-selector-group" role="group" aria-labelledby={heading ? `${id}-heading` : undefined}>
  {#if heading}<div id={`${id}-heading`} class="svadmin-ai-model-selector-group__heading">{heading}</div>{/if}
  {@render children?.()}
</div>

<style>
  .svadmin-ai-model-selector-group { display: grid; gap: .125rem; padding-block: .25rem; }
  .svadmin-ai-model-selector-group:not(:has([role='option']:not([hidden]))) { display: none; }
  .svadmin-ai-model-selector-group__heading { padding: .375rem .5rem .25rem; color: var(--muted-foreground, currentColor); font-size: .75rem; font-weight: 650; }
</style>
