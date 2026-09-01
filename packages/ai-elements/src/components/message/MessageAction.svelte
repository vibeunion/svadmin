<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  export type MessageActionProps = Omit<HTMLButtonAttributes, 'children' | 'class' | 'size'> & {
    tooltip?: string;
    label?: string;
    size?: 'sm' | 'default' | 'icon' | 'icon-sm';
    variant?: 'default' | 'outline' | 'ghost';
    class?: string;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';

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
  const tooltipId = $props.id();
  const describedBy = $derived([ariaDescribedBy, tooltip ? tooltipId : undefined].filter(Boolean).join(' ') || undefined);
</script>

<span class="svadmin-ai-message-action__anchor">
  <button
    {...rest}
    {type}
    {title}
    class={cn('svadmin-ai-message-action', className)}
    data-slot="message-action"
    data-size={size}
    data-variant={variant}
    aria-describedby={describedBy}
  >
    {@render children?.()}
    {#if label || tooltip}<span class="svadmin-ai__sr-only">{label ?? tooltip}</span>{/if}
  </button>
  {#if tooltip}<span id={tooltipId} class="svadmin-ai-message-action__tooltip" role="tooltip">{tooltip}</span>{/if}
</span>

<style>
  .svadmin-ai-message-action__anchor { position: relative; display: inline-flex; }
  .svadmin-ai-message-action { display: inline-flex; min-height: 2rem; align-items: center; justify-content: center; gap: 0.375rem; border: 1px solid transparent; border-radius: min(var(--radius, 0.5rem), 0.375rem); padding: 0.375rem 0.625rem; background: transparent; color: var(--muted-foreground, currentColor); font: inherit; font-size: 0.8125rem; cursor: pointer; }
  .svadmin-ai-message-action[data-size='icon'], .svadmin-ai-message-action[data-size='icon-sm'] { width: 2rem; padding: 0; }
  .svadmin-ai-message-action[data-variant='outline'] { border-color: var(--border, currentColor); }
  .svadmin-ai-message-action[data-variant='default'] { background: var(--primary, currentColor); color: var(--primary-foreground, Canvas); }
  .svadmin-ai-message-action:hover:not(:disabled) { background: var(--muted, transparent); color: var(--foreground, currentColor); }
  .svadmin-ai-message-action:disabled { cursor: not-allowed; opacity: 0.5; }
  .svadmin-ai-message-action:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-message-action__tooltip { position: absolute; z-index: 50; bottom: calc(100% + 0.5rem); left: 50%; width: max-content; max-width: 16rem; transform: translateX(-50%); visibility: hidden; border-radius: min(var(--radius, 0.5rem), 0.375rem); padding: 0.375rem 0.5rem; background: var(--popover, var(--foreground, currentColor)); color: var(--popover-foreground, var(--background, Canvas)); font-size: 0.75rem; line-height: 1.25; opacity: 0; pointer-events: none; transition: opacity 120ms ease, visibility 120ms ease; }
  .svadmin-ai-message-action__anchor:hover .svadmin-ai-message-action__tooltip,
  .svadmin-ai-message-action__anchor:focus-within .svadmin-ai-message-action__tooltip { visibility: visible; opacity: 1; }
  @media (prefers-reduced-motion: reduce) { .svadmin-ai-message-action__tooltip { transition: none; } }
</style>
