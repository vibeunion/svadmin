<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  export type TokensWithCostProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'class'> & {
    tokens?: number;
    costText?: string;
    class?: string;
    children?: Snippet<[{ tokens: string; costText?: string }]>;
  };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';

  let { tokens, costText, class: className = '', children, ...rest }: TokensWithCostProps = $props();
  const formattedTokens = $derived(tokens === undefined
    ? '-'
    : new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(tokens));
</script>

<span {...rest} class={cn('svadmin-ai-tokens-with-cost', className)} data-slot="tokens-with-cost">
  {#if children}
    {@render children({ tokens: formattedTokens, costText })}
  {:else}
    {formattedTokens}
    {#if costText}<span class="svadmin-ai-tokens-with-cost__cost">&bull; {costText}</span>{/if}
  {/if}
</span>

<style>
  .svadmin-ai-tokens-with-cost { font-variant-numeric: tabular-nums; }
  .svadmin-ai-tokens-with-cost__cost { margin-left: .5rem; color: var(--muted-foreground, currentColor); }
</style>
