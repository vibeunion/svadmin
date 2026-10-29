<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  export interface TimelineEntry {
    id: string;
    title: string;
    description?: string;
    time?: string;
    tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
    active?: boolean;
  }

  interface Props {
    items: TimelineEntry[];
    mode?: 'vertical' | 'horizontal';
    label?: string;
    class?: string;
    children?: Snippet<[TimelineEntry]>;
  }

  let { items, mode = 'vertical', label = 'Timeline', class: className = '', children }: Props = $props();
</script>

<ol class={cn('svadmin-timeline', className)} data-mode={mode} aria-label={label}>
  {#each items as item (item.id)}
    <li class="svadmin-timeline__item" data-tone={item.tone ?? 'neutral'} data-active={item.active ? 'true' : undefined}>
      <span class="svadmin-timeline__marker" aria-hidden="true"></span>
      <div class="svadmin-timeline__content">
        {#if children}
          {@render children(item)}
        {:else}
          {#if item.time}<time class="svadmin-timeline__time">{item.time}</time>{/if}
          <p class="svadmin-timeline__title">{item.title}</p>
          {#if item.description}<p class="svadmin-timeline__description">{item.description}</p>{/if}
        {/if}
      </div>
    </li>
  {/each}
</ol>

<style>
  .svadmin-timeline {
    display: grid;
    gap: var(--svadmin-space-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .svadmin-timeline__item {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--svadmin-space-3);
  }
  .svadmin-timeline__item:not(:last-child)::before {
    position: absolute;
    inset-block: 1rem calc(-1 * var(--svadmin-space-4));
    inset-inline-start: 0.3125rem;
    width: 1px;
    background: var(--border);
    content: '';
  }
  .svadmin-timeline__marker {
    width: 0.6875rem;
    height: 0.6875rem;
    margin-block-start: 0.3rem;
    border: 2px solid var(--border);
    border-radius: 999px;
    background: var(--card);
  }
  .svadmin-timeline__item[data-tone='info'] .svadmin-timeline__marker { border-color: var(--info, var(--primary)); }
  .svadmin-timeline__item[data-tone='success'] .svadmin-timeline__marker { border-color: var(--success, var(--primary)); }
  .svadmin-timeline__item[data-tone='warning'] .svadmin-timeline__marker { border-color: var(--warning, var(--primary)); }
  .svadmin-timeline__item[data-tone='danger'] .svadmin-timeline__marker { border-color: var(--destructive); }
  .svadmin-timeline__item[data-active='true'] .svadmin-timeline__marker { background: var(--primary); border-color: var(--primary); }
  .svadmin-timeline__content { min-width: 0; }
  .svadmin-timeline__time { color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  .svadmin-timeline__title { margin: 0; color: var(--foreground); font-size: var(--svadmin-text-body); font-weight: 600; }
  .svadmin-timeline__description { margin: var(--svadmin-space-1) 0 0; color: var(--muted-foreground); font-size: var(--svadmin-text-label); line-height: var(--svadmin-leading-body); }
  .svadmin-timeline[data-mode='horizontal'] {
    grid-auto-flow: column;
    grid-auto-columns: minmax(10rem, 1fr);
  }
  .svadmin-timeline[data-mode='horizontal'] .svadmin-timeline__item:not(:last-child)::before {
    inset: 0.3125rem calc(-1 * var(--svadmin-space-4)) auto auto;
    width: auto;
    height: 1px;
  }
</style>