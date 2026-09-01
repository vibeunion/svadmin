<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  export type ModelSelectorLogoGroupProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & { class?: string; children?: Snippet };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  let { class: className = '', children, ...rest }: ModelSelectorLogoGroupProps = $props();
</script>

<div {...rest} class={cn('svadmin-ai-model-selector-logo-group', className)} data-slot="model-selector-logo-group">
  {@render children?.()}
</div>

<style>
  .svadmin-ai-model-selector-logo-group { display: flex; flex: none; align-items: center; }
  .svadmin-ai-model-selector-logo-group :global(img + img) { margin-inline-start: -.25rem; }
  .svadmin-ai-model-selector-logo-group :global(img) { box-sizing: content-box; border-radius: 999px; padding: 1px; background: var(--background, transparent); outline: 1px solid var(--border, currentColor); }
  :global(.dark) .svadmin-ai-model-selector-logo-group :global(img) { background: var(--foreground, currentColor); }
</style>
