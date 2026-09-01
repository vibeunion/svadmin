<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  export type SuggestionVariant = 'outline' | 'default' | 'destructive' | 'secondary' | 'ghost' | 'link';
  export type SuggestionSize = 'default' | 'sm' | 'lg' | 'icon';
  export type SuggestionProps = Omit<HTMLButtonAttributes, 'children' | 'class' | 'onclick' | 'size'> & {
    suggestion: string;
    class?: string;
    variant?: SuggestionVariant;
    size?: SuggestionSize;
    children?: Snippet;
    onclick?: (suggestion: string) => void;
  };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';

  let {
    suggestion,
    onclick,
    class: className = '',
    variant = 'outline',
    size = 'sm',
    type = 'button',
    children,
    ...rest
  }: SuggestionProps = $props();
</script>

<button
  {...rest}
  {type}
  class={cn('svadmin-ai svadmin-ai-suggestion', className)}
  data-slot="suggestion"
  data-variant={variant}
  data-size={size}
  onclick={() => onclick?.(suggestion)}
>
  {#if children}{@render children()}{:else}{suggestion}{/if}
</button>

<style>
  .svadmin-ai-suggestion {
    display: inline-flex;
    min-height: 2rem;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border, currentColor);
    border-radius: 999px;
    padding: 0.375rem 1rem;
    background: transparent;
    color: var(--foreground, currentColor);
    font: inherit;
    font-size: 0.8125rem;
    line-height: 1.25;
    white-space: nowrap;
    cursor: pointer;
  }

  .svadmin-ai-suggestion[data-size='default'] { min-height: 2.25rem; }
  .svadmin-ai-suggestion[data-size='lg'] { min-height: 2.5rem; padding-inline: 1.25rem; }
  .svadmin-ai-suggestion[data-size='icon'] { width: 2.25rem; padding: 0; }
  .svadmin-ai-suggestion[data-variant='default'] { border-color: transparent; background: var(--primary, currentColor); color: var(--primary-foreground, Canvas); }
  .svadmin-ai-suggestion[data-variant='secondary'] { border-color: transparent; background: var(--secondary, var(--muted, transparent)); color: var(--secondary-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-suggestion[data-variant='destructive'] { border-color: transparent; background: var(--destructive, currentColor); color: var(--destructive-foreground, Canvas); }
  .svadmin-ai-suggestion[data-variant='ghost'], .svadmin-ai-suggestion[data-variant='link'] { border-color: transparent; }
  .svadmin-ai-suggestion[data-variant='link'] { color: var(--primary, currentColor); text-decoration: underline; text-underline-offset: 0.2em; }
  .svadmin-ai-suggestion:hover:not(:disabled) { background: var(--secondary, var(--muted, transparent)); }
  .svadmin-ai-suggestion:disabled { cursor: not-allowed; opacity: 0.5; }
  .svadmin-ai-suggestion:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
</style>
