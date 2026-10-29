<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronDown } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface CollapseItem {
    id: string;
    title: string;
    description?: string;
    content: Snippet;
    disabled?: boolean;
  }

  interface Props {
    items: CollapseItem[];
    openIds?: string[];
    multiple?: boolean;
    accordion?: boolean;
    class?: string;
    onchange?: (openIds: string[]) => void;
  }

  let {
    items,
    openIds = $bindable([]),
    multiple = true,
    accordion = false,
    class: className = '',
    onchange,
  }: Props = $props();

  function toggle(id: string, disabled = false): void {
    if (disabled) return;
    const isOpen = openIds.includes(id);
    let next: string[];
    if (isOpen) next = openIds.filter((value) => value !== id);
    else if (!multiple || accordion) next = [id];
    else next = [...openIds, id];
    openIds = next;
    onchange?.(next);
  }
</script>

<div class={cn('svadmin-collapse', className)}>
  {#each items as item (item.id)}
    {@const open = openIds.includes(item.id)}
    <section class="svadmin-collapse__item" data-state={open ? 'open' : 'closed'}>
      <button type="button" class={open ? 'svadmin-collapse__trigger is-open' : 'svadmin-collapse__trigger'} aria-expanded={open} aria-controls={`svadmin-collapse-${item.id}`} disabled={item.disabled} onclick={() => toggle(item.id, item.disabled)}>
        <span>
          <strong>{item.title}</strong>
          {#if item.description}<small>{item.description}</small>{/if}
        </span>
        <ChevronDown class="svadmin-collapse__chevron" size={16} aria-hidden="true" />
      </button>
      {#if open}
        <div id={`svadmin-collapse-${item.id}`} class="svadmin-collapse__content">
          {@render item.content()}
        </div>
      {/if}
    </section>
  {/each}
</div>

<style>
  .svadmin-collapse { border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
  .svadmin-collapse__item + .svadmin-collapse__item { border-block-start: 1px solid var(--border); }
  .svadmin-collapse__trigger { display: flex; align-items: center; justify-content: space-between; gap: var(--svadmin-space-3); width: 100%; padding: var(--svadmin-space-3) var(--svadmin-space-4); border: 0; background: var(--card); color: var(--foreground); text-align: start; cursor: pointer; }
  .svadmin-collapse__trigger:hover, .svadmin-collapse__trigger:focus-visible { background: var(--accent); outline: none; }
  .svadmin-collapse__trigger span { display: grid; gap: 0.1rem; }
  .svadmin-collapse__trigger strong { font-size: var(--svadmin-text-label); font-weight: 600; }
  .svadmin-collapse__trigger small { color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  .svadmin-collapse__chevron { flex: 0 0 auto; transition: transform 140ms ease; }
  :global(.svadmin-collapse__trigger.is-open .svadmin-collapse__chevron) { transform: rotate(180deg); }
  .svadmin-collapse__trigger:disabled { cursor: not-allowed; opacity: 0.5; }
  .svadmin-collapse__content { padding: var(--svadmin-space-3) var(--svadmin-space-4) var(--svadmin-space-4); border-block-start: 1px solid var(--border); color: var(--muted-foreground); font-size: var(--svadmin-text-label); }
  @media (prefers-reduced-motion: reduce) { .svadmin-collapse__chevron { transition: none; } }
</style>