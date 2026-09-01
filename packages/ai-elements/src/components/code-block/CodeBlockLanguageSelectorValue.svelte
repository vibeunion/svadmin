<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; import { useCodeBlockLanguageSelectorContext } from './context.svelte.js';
  let { placeholder = 'Language', class: className = '', children, ...rest }: { placeholder?: string; class?: string; children?: Snippet<[string]>; [key: string]: unknown } = $props(); const context = useCodeBlockLanguageSelectorContext();
</script>
<span class={cn('truncate', className)} {...rest}>{#if children}{@render children(context.value)}{:else}{context.value || placeholder}{/if}</span>
