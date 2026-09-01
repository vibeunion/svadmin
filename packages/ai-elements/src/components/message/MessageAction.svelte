<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  export type MessageActionProps = Omit<HTMLButtonAttributes, 'children' | 'class' | 'size'> & {
    tooltip?: string;
    label?: string;
    size?: 'xs' | 'sm' | 'default' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg';
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    class?: string;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import Tooltip from '../../internal/Tooltip.svelte';

  let {
    tooltip,
    label,
    size = 'icon-sm',
    variant = 'ghost',
    class: className = '',
    type = 'button',
    title,
    children,
    'aria-describedby': ariaDescribedBy,
    ...rest
  }: MessageActionProps = $props();
  const actionChildren = $derived(children);
</script>

<Tooltip content={tooltip}>
  {#snippet children({ describedBy: tooltipDescribedBy })}
  <button
    {...rest}
    {type}
    {title}
    class={cn('svadmin-ai-message-action', className)}
    data-slot="message-action"
    data-size={size}
    data-variant={variant}
    aria-describedby={[ariaDescribedBy, tooltipDescribedBy].filter(Boolean).join(' ') || undefined}
  >
    {@render actionChildren?.()}
    {#if label || tooltip}<span class="svadmin-ai__sr-only">{label ?? tooltip}</span>{/if}
  </button>
  {/snippet}
</Tooltip>

<style>
  .svadmin-ai-message-action { display: inline-flex; min-height: 2rem; align-items: center; justify-content: center; gap: 0.375rem; border: 1px solid transparent; border-radius: min(var(--radius, 0.5rem), 0.375rem); padding: 0.375rem 0.625rem; background: transparent; color: var(--muted-foreground, currentColor); font: inherit; font-size: 0.8125rem; cursor: pointer; }
  .svadmin-ai-message-action[data-size='xs'] { min-height: 1.5rem; padding: 0.2rem 0.4rem; font-size: 0.75rem; }
  .svadmin-ai-message-action[data-size='lg'] { min-height: 2.5rem; padding-inline: 1rem; }
  .svadmin-ai-message-action[data-size^='icon'] { width: 2rem; padding: 0; }
  .svadmin-ai-message-action[data-size='icon-xs'] { width: 1.5rem; min-height: 1.5rem; }
  .svadmin-ai-message-action[data-size='icon-lg'] { width: 2.5rem; min-height: 2.5rem; }
  .svadmin-ai-message-action[data-variant='outline'] { border-color: var(--border, currentColor); }
  .svadmin-ai-message-action[data-variant='default'] { background: var(--primary, currentColor); color: var(--primary-foreground, Canvas); }
  .svadmin-ai-message-action[data-variant='secondary'] { background: var(--secondary, var(--muted, transparent)); color: var(--secondary-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-message-action[data-variant='destructive'] { background: var(--destructive, currentColor); color: var(--destructive-foreground, Canvas); }
  .svadmin-ai-message-action[data-variant='link'] { padding-inline: 0; color: var(--primary, currentColor); text-decoration: underline; text-underline-offset: 0.2rem; }
  .svadmin-ai-message-action[data-variant='ghost']:hover:not(:disabled), .svadmin-ai-message-action[data-variant='outline']:hover:not(:disabled) { background: var(--muted, transparent); color: var(--foreground, currentColor); }
  .svadmin-ai-message-action[data-variant='default']:hover:not(:disabled) { background: color-mix(in oklch, var(--primary, currentColor) 88%, var(--background, Canvas)); color: var(--primary-foreground, Canvas); }
  .svadmin-ai-message-action[data-variant='secondary']:hover:not(:disabled) { background: color-mix(in oklch, var(--secondary, var(--muted, transparent)) 80%, var(--foreground, currentColor)); color: var(--secondary-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-message-action[data-variant='destructive']:hover:not(:disabled) { background: color-mix(in oklch, var(--destructive, currentColor) 88%, var(--background, Canvas)); color: var(--destructive-foreground, Canvas); }
  .svadmin-ai-message-action:disabled { cursor: not-allowed; opacity: 0.5; }
  .svadmin-ai-message-action:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
</style>
