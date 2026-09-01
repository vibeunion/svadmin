<script module lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLButtonAttributes } from 'svelte/elements';
  export type PromptInputButtonTooltip = string | { content: string; shortcut?: string; side?: 'top' | 'right' | 'bottom' | 'left' };
  export interface PromptInputButtonProps extends Omit<HTMLButtonAttributes, 'children' | 'class'> { class?: string; children?: Snippet; tooltip?: PromptInputButtonTooltip; variant?: 'default' | 'ghost' | 'outline'; size?: 'sm' | 'icon-sm'; }
</script>
<script lang="ts">
  import { cn } from '../../utils.js';
  let { class: className = '', children, tooltip, variant = 'ghost', size = 'icon-sm', type = 'button', title, ...rest }: PromptInputButtonProps = $props();
  const tooltipText = $derived(typeof tooltip === 'string' ? tooltip : tooltip?.content);
</script>
<button {...rest} {type} title={title ?? tooltipText} class={cn('svadmin-ai__button', variant === 'ghost' && 'svadmin-ai__button--ghost', variant === 'outline' && 'border border-border bg-transparent', size === 'icon-sm' ? 'size-8 min-h-8 p-0' : 'min-h-8 px-3', className)} data-slot="prompt-input-button">{@render children?.()}{#if tooltip && typeof tooltip !== 'string' && tooltip.shortcut}<span class="svadmin-ai__sr-only">{tooltip.shortcut}</span>{/if}</button>
