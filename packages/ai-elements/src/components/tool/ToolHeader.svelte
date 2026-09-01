<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { ToolDisplayState } from './status.js';

  export type ToolHeaderProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'class' | 'title'> & {
    title?: string;
    type?: string;
    state?: ToolDisplayState;
    toolName?: string;
    class?: string;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { CheckCircle2, ChevronDown, Circle, CircleX, Clock3, Wrench } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useToolContext } from './context.svelte.js';
  import { getStatusBadge } from './status.js';

  let { title, type, state: stateProp, toolName, class: className = '', children, ...rest }: ToolHeaderProps = $props();
  const tool = useToolContext('ToolHeader');
  const resolvedState = $derived(stateProp ?? tool.state);
  const badge = $derived(getStatusBadge(resolvedState));
  const derivedName = $derived(title ?? toolName ?? (type === 'dynamic-tool' ? toolName : type?.split('-').slice(1).join('-')) ?? tool.name);
</script>

<summary {...rest} class={cn('svadmin-ai-tool-header', className)} data-slot="tool-header">
  {#if children}
    {@render children()}
  {:else}
    <span class="svadmin-ai-tool-header__summary">
      <Wrench size={16} aria-hidden="true" />
      <strong>{derivedName}</strong>
      <span class="svadmin-ai-tool-header__badge" data-tone={badge.tone}>
        {#if badge.icon === 'check-circle'}<CheckCircle2 size={14} aria-hidden="true" />
        {:else if badge.icon === 'x-circle'}<CircleX size={14} aria-hidden="true" />
        {:else if badge.icon === 'clock'}<Clock3 class={badge.pulse ? 'animate-pulse' : ''} size={14} aria-hidden="true" />
        {:else}<Circle size={12} aria-hidden="true" />{/if}
        {badge.label}
      </span>
    </span>
    <ChevronDown class={cn(tool.open && 'svadmin-ai-tool-header__chevron--open')} size={16} aria-hidden="true" />
  {/if}
</summary>

<style>
  .svadmin-ai-tool-header { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.75rem; cursor: pointer; list-style: none; }
  .svadmin-ai-tool-header::-webkit-details-marker { display: none; }
  .svadmin-ai-tool-header__summary, .svadmin-ai-tool-header__badge { display: inline-flex; align-items: center; gap: 0.5rem; min-width: 0; }
  .svadmin-ai-tool-header__summary strong { overflow: hidden; font-size: 0.875rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-ai-tool-header__summary > :global(svg) { color: var(--muted-foreground, currentColor); }
  .svadmin-ai-tool-header__badge { flex: none; border-radius: 999px; padding: 0.2rem 0.5rem; background: var(--muted, transparent); color: var(--muted-foreground, currentColor); font-size: 0.6875rem; }
  .svadmin-ai-tool-header__badge[data-tone='success'] { color: var(--success, currentColor); }
  .svadmin-ai-tool-header__badge[data-tone='info'] { color: var(--info, currentColor); }
  .svadmin-ai-tool-header__badge[data-tone='warning'] { color: var(--warning, currentColor); }
  .svadmin-ai-tool-header__badge[data-tone='danger'] { color: var(--destructive, currentColor); }
  .svadmin-ai-tool-header__badge[data-tone='pending'] { color: var(--primary, currentColor); }
  .svadmin-ai-tool-header > :global(svg:last-child) { flex: none; color: var(--muted-foreground, currentColor); transition: transform 150ms ease; }
  .svadmin-ai-tool-header > :global(.svadmin-ai-tool-header__chevron--open) { transform: rotate(180deg); }
  .svadmin-ai-tool-header:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { .svadmin-ai-tool-header > :global(svg:last-child) { transition: none; } }
</style>
