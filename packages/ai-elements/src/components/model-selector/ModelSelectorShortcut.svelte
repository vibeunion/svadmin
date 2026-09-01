<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  export type ModelSelectorShortcutProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'class'> & { class?: string; children?: Snippet };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  let { class: className = '', children, ...rest }: ModelSelectorShortcutProps = $props();
</script>

<span {...rest} class={cn('svadmin-ai-model-selector-shortcut', className)} data-slot="model-selector-shortcut">
  {@render children?.()}
</span>

<style>
  .svadmin-ai-model-selector-shortcut { margin-inline-start: auto; color: var(--muted-foreground, currentColor); font-size: .75rem; letter-spacing: 0; }
</style>
