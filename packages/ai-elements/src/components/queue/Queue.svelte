<script module lang="ts">
  export type QueueItemStatus = 'queued' | 'running' | 'complete' | 'failed' | 'cancelled';
  export interface QueueDataItem {
    id: string;
    title: string;
    description?: string;
    status?: QueueItemStatus;
    progress?: number;
    createdAt?: number | Date;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Check, CircleAlert, Clock3, LoaderCircle, ListTodo, RotateCcw, X } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  interface Props {
    items?: QueueDataItem[];
    title?: string;
    selectedId?: string | null;
    emptyLabel?: string;
    class?: string;
    children?: Snippet;
    onselect?: (item: QueueDataItem) => void;
    oncancel?: (item: QueueDataItem) => void | Promise<void>;
    onretry?: (item: QueueDataItem) => void | Promise<void>;
    onclear?: () => void | Promise<void>;
  }

  let {
    items = [],
    title = 'Queue',
    selectedId = $bindable<string | null>(null),
    emptyLabel = 'Nothing in the queue.',
    class: className = '',
    children,
    onselect,
    oncancel,
    onretry,
    onclear,
  }: Props = $props();

  const componentId = $props.id();
  let busyId = $state<string | null>(null);
  const activeCount = $derived(items.filter((item) => item.status === 'running' || item.status === 'queued').length);

  function statusOf(item: QueueDataItem): QueueItemStatus {
    return item.status ?? 'queued';
  }

  async function run(item: QueueDataItem, action?: (value: QueueDataItem) => void | Promise<void>) {
    if (!action || busyId) return;
    busyId = item.id;
    try {
      await action(item);
    } finally {
      busyId = null;
    }
  }
</script>

<section class={cn('svadmin-ai-queue', className)} aria-labelledby={`${componentId}-title`}>
  {#if children && items.length === 0}
    {@render children()}
  {:else}
  <header class="svadmin-ai-queue__header">
    <div class="svadmin-ai-queue__title"><ListTodo size={16} aria-hidden="true" /><h3 id={`${componentId}-title`}>{title}</h3><span>{activeCount}</span></div>
    {#if onclear && items.length > 0}<button class="svadmin-ai-queue__clear" type="button" onclick={onclear}>Clear completed</button>{/if}
  </header>

  {#if items.length === 0}
    <p class="svadmin-ai-queue__empty">{emptyLabel}</p>
  {:else}
    <ul class="svadmin-ai-queue__list">
      {#each items as item (item.id)}
        {@const status = statusOf(item)}
        <li class={cn('svadmin-ai-queue__item', `svadmin-ai-queue__item--${status}`, selectedId === item.id && 'svadmin-ai-queue__item--selected')}>
          <button class="svadmin-ai-queue__item-main" type="button" aria-pressed={selectedId === item.id} onclick={() => { selectedId = item.id; onselect?.(item); }}>
            <span class="svadmin-ai-queue__marker" aria-hidden="true">
              {#if status === 'running'}<LoaderCircle class="svadmin-ai-queue__spin" size={14} />{:else if status === 'complete'}<Check size={14} />{:else if status === 'failed'}<CircleAlert size={14} />{:else if status === 'cancelled'}<X size={14} />{:else}<Clock3 size={14} />{/if}
            </span>
            <span class="svadmin-ai-queue__copy"><strong title={item.title}>{item.title}</strong>{#if item.description}<small title={item.description}>{item.description}</small>{/if}{#if typeof item.progress === 'number'}{@const normalizedProgress = Math.max(0, Math.min(100, item.progress))}<span class="svadmin-ai-queue__progress" aria-label={`${normalizedProgress}% complete`}><span style={`width: ${normalizedProgress}%`}></span></span>{/if}</span>
          </button>
          <div class="svadmin-ai-queue__actions">
            {#if status === 'running' && oncancel}<button type="button" class="svadmin-ai-queue__icon-button" aria-label={`Cancel ${item.title}`} title={`Cancel ${item.title}`} disabled={busyId !== null} onclick={() => run(item, oncancel)}><X size={14} aria-hidden="true" /></button>{/if}
            {#if status === 'failed' && onretry}<button type="button" class="svadmin-ai-queue__icon-button" aria-label={`Retry ${item.title}`} title={`Retry ${item.title}`} disabled={busyId !== null} onclick={() => run(item, onretry)}><RotateCcw size={14} aria-hidden="true" /></button>{/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
  {#if children}<div class="svadmin-ai-queue__footer">{@render children()}</div>{/if}
  {/if}
</section>

<style>
  .svadmin-ai-queue { display: grid; gap: .75rem; padding: 1rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--card, var(--background, transparent)); color: var(--card-foreground, var(--foreground, currentColor)); }
  .svadmin-ai-queue__header, .svadmin-ai-queue__title { display: flex; align-items: center; }
  .svadmin-ai-queue__header { justify-content: space-between; gap: .75rem; }
  .svadmin-ai-queue__title { gap: .5rem; }
  h3 { margin: 0; font-size: .9rem; font-weight: 650; }
  .svadmin-ai-queue__title > span { display: inline-flex; min-width: 1.3rem; height: 1.3rem; align-items: center; justify-content: center; border-radius: 999px; background: var(--muted, transparent); color: var(--muted-foreground, currentColor); font-size: .7rem; font-variant-numeric: tabular-nums; }
  .svadmin-ai-queue__clear { border: 0; padding: 0; background: transparent; color: var(--primary, currentColor); font: inherit; font-size: .73rem; cursor: pointer; }
  .svadmin-ai-queue__clear:focus-visible, .svadmin-ai-queue__item-main:focus-visible, .svadmin-ai-queue__icon-button:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-queue__empty { margin: 0; padding: 1rem 0; color: var(--muted-foreground, currentColor); font-size: .8rem; text-align: center; }
  .svadmin-ai-queue__list { display: grid; gap: .3rem; margin: 0; padding: 0; list-style: none; }
  .svadmin-ai-queue__item { display: flex; align-items: center; gap: .4rem; min-width: 0; border: 1px solid transparent; border-radius: min(var(--radius, .5rem), .5rem); }
  .svadmin-ai-queue__item--selected { border-color: var(--ring, var(--primary, currentColor)); background: color-mix(in oklch, var(--primary, currentColor) 7%, transparent); }
  .svadmin-ai-queue__item-main { display: flex; flex: 1; min-width: 0; align-items: flex-start; gap: .55rem; padding: .55rem; border: 0; background: transparent; color: inherit; text-align: left; font: inherit; cursor: pointer; }
  .svadmin-ai-queue__marker { display: inline-flex; width: 1.55rem; height: 1.55rem; flex: none; align-items: center; justify-content: center; border-radius: 50%; background: var(--muted, transparent); color: var(--muted-foreground, currentColor); }
  .svadmin-ai-queue__item--running .svadmin-ai-queue__marker { color: var(--primary, currentColor); }
  .svadmin-ai-queue__item--complete .svadmin-ai-queue__marker { color: var(--success, currentColor); }
  .svadmin-ai-queue__item--failed .svadmin-ai-queue__marker { color: var(--destructive, currentColor); }
  .svadmin-ai-queue__copy { display: grid; min-width: 0; flex: 1; gap: .16rem; }
  .svadmin-ai-queue__copy strong { overflow: hidden; font-size: .8rem; font-weight: 550; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-ai-queue__copy small { overflow: hidden; color: var(--muted-foreground, currentColor); font-size: .72rem; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-ai-queue__progress { display: block; height: .22rem; overflow: hidden; margin-top: .2rem; border-radius: 999px; background: var(--muted, transparent); }
  .svadmin-ai-queue__progress > span { display: block; height: 100%; border-radius: inherit; background: var(--primary, currentColor); }
  .svadmin-ai-queue__actions { display: flex; flex: none; gap: .2rem; padding-right: .35rem; }
  .svadmin-ai-queue__icon-button { display: inline-flex; width: 1.9rem; height: 1.9rem; align-items: center; justify-content: center; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: transparent; color: var(--foreground, currentColor); cursor: pointer; }
  .svadmin-ai-queue__icon-button:hover:not(:disabled) { background: var(--muted, transparent); }
  .svadmin-ai-queue__icon-button:disabled { cursor: not-allowed; opacity: .5; }
  .svadmin-ai-queue__spin { animation: svadmin-ai-queue-spin 1s linear infinite; }
  .svadmin-ai-queue__footer { border-top: 1px solid var(--border, currentColor); padding-top: .75rem; }
  @keyframes svadmin-ai-queue-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .svadmin-ai-queue__spin { animation: none; } }
</style>
