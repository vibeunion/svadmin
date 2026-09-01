<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { formatContextTokens, useContextContext } from './context-state.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props(); const context = useContextContext('ContextContentHeader');
  const percent = $derived(context.maxTokens > 0 ? Math.min(100, Math.max(0, context.usedTokens / context.maxTokens * 100)) : 0);
</script>
<div {...rest} class={cn('svadmin-ai-context-part__header', className)} data-slot="context-content-header">
  {#if children}{@render children()}{:else}<div><span>{percent.toFixed(1)}%</span><code>{formatContextTokens(context.usedTokens)} / {formatContextTokens(context.maxTokens)}</code></div><div class="svadmin-ai-context-part__meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(percent)}><span style={`width: ${percent}%`}></span></div>{/if}
</div>
<style>.svadmin-ai-context-part__header { display: grid; gap: .55rem; padding: .75rem; }.svadmin-ai-context-part__header > div:first-child { display: flex; align-items: center; justify-content: space-between; gap: .75rem; font-size: .75rem; }.svadmin-ai-context-part__header code { color: var(--muted-foreground, currentColor); font-size: .72rem; }.svadmin-ai-context-part__meter { height: .35rem; overflow: hidden; border-radius: 999px; background: var(--muted, transparent); }.svadmin-ai-context-part__meter span { display: block; height: 100%; background: var(--primary, currentColor); }</style>
