<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; import { usePromptInputCommand } from './context.svelte.js';
  let { class: className = '', children }: { class?: string; children?: Snippet } = $props(); const command = usePromptInputCommand();
</script>
{#if command.visibleCount === 0}<p class={cn('px-3 py-6 text-center text-sm text-muted-foreground', className)} data-slot="prompt-input-command-empty">{#if children}{@render children()}{:else}No results found.{/if}</p>{/if}
