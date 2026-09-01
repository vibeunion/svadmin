<script module lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  export type ModelSelectorSeparatorProps = Omit<HTMLAttributes<HTMLDivElement>, 'class'> & { class?: string };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  let { class: className = '', ...rest }: ModelSelectorSeparatorProps = $props();
</script>

<div {...rest} class={cn('svadmin-ai-model-selector-separator', className)} data-slot="model-selector-separator" role="separator"></div>

<style>
  .svadmin-ai-model-selector-separator { height: 1px; margin: .25rem -.125rem; background: var(--border, currentColor); }
</style>
