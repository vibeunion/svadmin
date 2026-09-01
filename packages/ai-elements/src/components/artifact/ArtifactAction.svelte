<script module lang="ts">
  import type { LucideIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  export interface ArtifactActionProps extends Omit<HTMLButtonAttributes, 'children' | 'class' | 'title'> {
    label?: string;
    tooltip?: string;
    icon?: LucideIcon;
    size?: 'xs' | 'sm' | 'default' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg';
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    title?: string;
    class?: string;
    children?: Snippet;
  }
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import Tooltip from '../../internal/Tooltip.svelte';
  let {
    label,
    tooltip,
    icon,
    size = 'sm',
    variant = 'ghost',
    title,
    class: className = '',
    children,
    type = 'button',
    'aria-describedby': ariaDescribedBy,
    ...rest
  }: ArtifactActionProps = $props();
  const accessibleLabel = $derived(label ?? tooltip);
  const Icon = $derived(icon);
  const actionChildren = $derived(children);
</script>

<Tooltip content={tooltip}>
  {#snippet children({ describedBy: tooltipDescribedBy })}
  <button {...rest} {type} class={cn('svadmin-ai-artifact-part__action', className)} aria-label={accessibleLabel} aria-describedby={[ariaDescribedBy, tooltipDescribedBy].filter(Boolean).join(' ') || undefined} {title} data-slot="artifact-action" data-size={size} data-variant={variant}>
    {#if Icon}<Icon size={16} aria-hidden="true" />{:else}{@render actionChildren?.()}{/if}
    {#if accessibleLabel}<span class="svadmin-ai__sr-only">{accessibleLabel}</span>{/if}
  </button>
  {/snippet}
</Tooltip>

<style>
  .svadmin-ai-artifact-part__action { display: inline-flex; min-height: 2rem; align-items: center; justify-content: center; gap: .35rem; border: 1px solid transparent; border-radius: min(var(--radius, .5rem), .5rem); padding: .35rem .5rem; background: transparent; color: var(--muted-foreground, currentColor); font: inherit; font-size: .78rem; cursor: pointer; }
  .svadmin-ai-artifact-part__action[data-size='xs'] { min-height: 1.5rem; padding: .2rem .4rem; font-size: .72rem; }
  .svadmin-ai-artifact-part__action[data-size^='icon'] { width: 2rem; padding: 0; }
  .svadmin-ai-artifact-part__action[data-size='icon-xs'] { width: 1.5rem; min-height: 1.5rem; }
  .svadmin-ai-artifact-part__action[data-size='icon-lg'] { width: 2.5rem; min-height: 2.5rem; }
  .svadmin-ai-artifact-part__action[data-size='lg'] { min-height: 2.5rem; padding-inline: .75rem; }
  .svadmin-ai-artifact-part__action[data-variant='outline'] { border-color: var(--border, currentColor); }
  .svadmin-ai-artifact-part__action[data-variant='default'] { border-color: var(--primary, currentColor); background: var(--primary, currentColor); color: var(--primary-foreground, Canvas); }
  .svadmin-ai-artifact-part__action[data-variant='secondary'] { background: var(--secondary, var(--muted, transparent)); color: var(--secondary-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-artifact-part__action[data-variant='destructive'] { background: var(--destructive, currentColor); color: var(--destructive-foreground, Canvas); }
  .svadmin-ai-artifact-part__action[data-variant='link'] { padding-inline: 0; color: var(--primary, currentColor); text-decoration: underline; text-underline-offset: .2rem; }
  .svadmin-ai-artifact-part__action[data-variant='ghost']:hover:not(:disabled), .svadmin-ai-artifact-part__action[data-variant='outline']:hover:not(:disabled) { border-color: var(--border, currentColor); background: var(--muted, transparent); color: var(--foreground, currentColor); }
  .svadmin-ai-artifact-part__action[data-variant='default']:hover:not(:disabled) { border-color: var(--primary, currentColor); background: color-mix(in oklch, var(--primary, currentColor) 88%, var(--background, Canvas)); color: var(--primary-foreground, Canvas); }
  .svadmin-ai-artifact-part__action[data-variant='secondary']:hover:not(:disabled) { background: color-mix(in oklch, var(--secondary, var(--muted, transparent)) 80%, var(--foreground, currentColor)); color: var(--secondary-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-artifact-part__action[data-variant='destructive']:hover:not(:disabled) { border-color: var(--destructive, currentColor); background: color-mix(in oklch, var(--destructive, currentColor) 88%, var(--background, Canvas)); color: var(--destructive-foreground, Canvas); }
  .svadmin-ai-artifact-part__action:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-artifact-part__action:disabled { cursor: not-allowed; opacity: .5; }
</style>
