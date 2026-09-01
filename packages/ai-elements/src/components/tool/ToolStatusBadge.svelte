<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { ToolDisplayState } from './status.js';

  export type ToolStatusBadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'class'> & {
    state: ToolDisplayState;
    class?: string;
    children?: Snippet<[{ label: string }]>;
  };
</script>

<script lang="ts">
  import { CheckCircle2, Circle, CircleX, Clock3 } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { getStatusBadge } from './status.js';

  let { state, class: className = '', children, ...rest }: ToolStatusBadgeProps = $props();
  const badge = $derived(getStatusBadge(state));
</script>

<span {...rest} class={cn('svadmin-ai-tool-status', className)} data-tone={badge.tone} data-slot="tool-status-badge">
  {#if children}
    {@render children({ label: badge.label })}
  {:else}
    {#if badge.icon === 'check-circle'}<CheckCircle2 size={14} aria-hidden="true" />
    {:else if badge.icon === 'x-circle'}<CircleX size={14} aria-hidden="true" />
    {:else if badge.icon === 'clock'}<Clock3 class={badge.pulse ? 'animate-pulse' : ''} size={14} aria-hidden="true" />
    {:else}<Circle size={12} aria-hidden="true" />{/if}
    <span>{badge.label}</span>
  {/if}
</span>

<style>
  .svadmin-ai-tool-status { display: inline-flex; align-items: center; gap: .375rem; border-radius: 999px; padding: .2rem .5rem; background: var(--muted, transparent); color: var(--muted-foreground, currentColor); font-size: .6875rem; }
  .svadmin-ai-tool-status[data-tone='success'] { color: var(--success, currentColor); }
  .svadmin-ai-tool-status[data-tone='info'] { color: var(--info, currentColor); }
  .svadmin-ai-tool-status[data-tone='warning'] { color: var(--warning, currentColor); }
  .svadmin-ai-tool-status[data-tone='danger'] { color: var(--destructive, currentColor); }
  .svadmin-ai-tool-status[data-tone='pending'] { color: var(--primary, currentColor); }
</style>
