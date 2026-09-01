<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; import { usePromptInputSelect } from './context.svelte.js';
  let { class: className = '', children }: { class?: string; children?: Snippet<[string]> } = $props(); const select = usePromptInputSelect();
</script>
<span class={cn('truncate', className)} data-slot="prompt-input-select-value">{#if children}{@render children(select.value)}{:else}{select.value}{/if}</span>
