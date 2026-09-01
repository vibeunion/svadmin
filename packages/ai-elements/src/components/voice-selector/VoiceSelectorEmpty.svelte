<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; import { useVoiceSelector } from './context.svelte.js'; let { class: className = '', children }: { class?: string; children?: Snippet } = $props(); const selector = useVoiceSelector();
</script>
{#if selector.visibleCount === 0}<p class={cn('px-3 py-8 text-center text-sm text-muted-foreground', className)} data-slot="voice-selector-empty">{#if children}{@render children()}{:else}No voices found.{/if}</p>{/if}
