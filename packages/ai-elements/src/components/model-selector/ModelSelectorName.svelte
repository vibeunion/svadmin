<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  export type ModelSelectorNameProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'class'> & { class?: string; children?: Snippet };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  let { class: className = '', children, ...rest }: ModelSelectorNameProps = $props();
</script>

<span {...rest} class={cn('svadmin-ai-model-selector-name', className)} data-slot="model-selector-name">
  {@render children?.()}
</span>

<style>
  .svadmin-ai-model-selector-name { min-width: 0; flex: 1; overflow: hidden; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
</style>
