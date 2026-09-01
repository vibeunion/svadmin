<script module lang="ts">
  import type { LucideIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  export interface ArtifactActionProps extends Omit<HTMLButtonAttributes, 'children' | 'class' | 'title'> {
    label?: string;
    tooltip?: string;
    icon?: LucideIcon;
    size?: 'sm' | 'default' | 'icon' | 'icon-sm' | 'lg';
    variant?: 'default' | 'outline' | 'ghost';
    title?: string;
    class?: string;
    children?: Snippet;
  }
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
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
  const tooltipId = $props.id();
  const describedBy = $derived([ariaDescribedBy, tooltip ? tooltipId : undefined].filter(Boolean).join(' ') || undefined);
</script>

<span class="svadmin-ai-artifact-part__action-anchor">
  <button {...rest} {type} class={cn('svadmin-ai-artifact-part__action', className)} aria-label={accessibleLabel} aria-describedby={describedBy} {title} data-slot="artifact-action" data-size={size} data-variant={variant}>
    {#if Icon}<Icon size={16} aria-hidden="true" />{:else}{@render children?.()}{/if}
    {#if accessibleLabel}<span class="svadmin-ai__sr-only">{accessibleLabel}</span>{/if}
  </button>
  {#if tooltip}<span id={tooltipId} class="svadmin-ai-artifact-part__tooltip" role="tooltip">{tooltip}</span>{/if}
</span>

<style>
  .svadmin-ai-artifact-part__action-anchor { position: relative; display: inline-flex; }
  .svadmin-ai-artifact-part__action { display: inline-flex; min-height: 2rem; align-items: center; justify-content: center; gap: .35rem; border: 1px solid transparent; border-radius: min(var(--radius, .5rem), .5rem); padding: .35rem .5rem; background: transparent; color: var(--muted-foreground, currentColor); font: inherit; font-size: .78rem; cursor: pointer; }
  .svadmin-ai-artifact-part__action[data-size='icon'], .svadmin-ai-artifact-part__action[data-size='icon-sm'] { width: 2rem; padding: 0; }
  .svadmin-ai-artifact-part__action[data-size='lg'] { min-height: 2.5rem; padding-inline: .75rem; }
  .svadmin-ai-artifact-part__action[data-variant='outline'] { border-color: var(--border, currentColor); }
  .svadmin-ai-artifact-part__action[data-variant='default'] { border-color: var(--primary, currentColor); background: var(--primary, currentColor); color: var(--primary-foreground, Canvas); }
  .svadmin-ai-artifact-part__action:hover:not(:disabled) { border-color: var(--border, currentColor); color: var(--foreground, currentColor); }
  .svadmin-ai-artifact-part__action:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-artifact-part__action:disabled { cursor: not-allowed; opacity: .5; }
  .svadmin-ai-artifact-part__tooltip { position: absolute; z-index: 50; bottom: calc(100% + .5rem); left: 50%; width: max-content; max-width: 16rem; transform: translateX(-50%); visibility: hidden; border-radius: min(var(--radius, .5rem), .375rem); padding: .375rem .5rem; background: var(--popover, var(--foreground, currentColor)); color: var(--popover-foreground, var(--background, Canvas)); font-size: .75rem; line-height: 1.25; opacity: 0; pointer-events: none; transition: opacity 120ms ease, visibility 120ms ease; }
  .svadmin-ai-artifact-part__action-anchor:hover .svadmin-ai-artifact-part__tooltip,
  .svadmin-ai-artifact-part__action-anchor:focus-within .svadmin-ai-artifact-part__tooltip { visibility: visible; opacity: 1; }
  @media (prefers-reduced-motion: reduce) { .svadmin-ai-artifact-part__tooltip { transition: none; } }
</style>
