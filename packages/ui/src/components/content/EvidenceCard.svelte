<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';
  import StatusPill, { type StatusPillTone } from './StatusPill.svelte';

  interface Props {
    title: string;
    status: string;
    statusTone?: StatusPillTone;
    description?: string;
    source?: string;
    children?: Snippet;
    class?: string;
  }

  let {
    title,
    status,
    statusTone = 'neutral',
    description,
    source,
    children,
    class: className = '',
  }: Props = $props();
</script>

<article aria-label={title} class={cn('svadmin-evidence-card', className)} data-svadmin-evidence-card data-accent={statusTone}>
  <div class="svadmin-evidence-card__header">
    <h3>{title}</h3>
    <StatusPill label={status} tone={statusTone} />
  </div>
  {#if description}<p class="svadmin-evidence-card__description">{description}</p>{/if}
  {#if children}<div class="svadmin-evidence-card__body">{@render children()}</div>{/if}
  {#if source}<p class="svadmin-evidence-card__source">{source}</p>{/if}
</article>
