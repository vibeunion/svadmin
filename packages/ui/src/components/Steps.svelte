<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Check, X } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface StepItem {
    id?: string;
    title: string;
    description?: string;
    icon?: Snippet;
    disabled?: boolean;
  }

  interface Props {
    current?: number;
    items: StepItem[];
    direction?: 'horizontal' | 'vertical';
    labelPlacement?: 'horizontal' | 'vertical';
    status?: 'wait' | 'process' | 'finish' | 'error';
    clickable?: boolean;
    class?: string;
    onchange?: (index: number) => void;
  }

  let {
    current = 0,
    items,
    direction = 'horizontal',
    labelPlacement = 'horizontal',
    status = 'process',
    clickable = false,
    class: className = '',
    onchange,
  }: Props = $props();

  function state(index: number): 'finish' | 'process' | 'wait' | 'error' {
    if (index < current) return 'finish';
    if (index === current) return status === 'error' ? 'error' : status === 'finish' ? 'finish' : 'process';
    return 'wait';
  }

  function choose(index: number): void {
    const item = items[index];
    if (!clickable || !item || item.disabled || index === current) return;
    onchange?.(index);
  }
</script>

<ol class={cn('svadmin-steps', className)} data-direction={direction} data-label-placement={labelPlacement} aria-label="Steps">
  {#each items as item, index (item.id ?? `${item.title}-${index}`)}
    {@const stateValue = state(index)}
    <li class="svadmin-steps__item" data-status={stateValue} data-disabled={item.disabled || undefined}>
      <button
        type="button"
        class="svadmin-steps__action"
        disabled={!clickable || item.disabled}
        onclick={() => choose(index)}
        aria-current={index === current ? 'step' : undefined}
      >
        <span class="svadmin-steps__indicator" aria-hidden="true">
          {#if stateValue === 'finish'}<Check size={14} />{:else if stateValue === 'error'}<X size={14} />{:else if item.icon}{@render item.icon()}{:else}{index + 1}{/if}
        </span>
        <span class="svadmin-steps__text">
          <span class="svadmin-steps__title">{item.title}</span>
          {#if item.description}<span class="svadmin-steps__description">{item.description}</span>{/if}
        </span>
      </button>
      {#if index < items.length - 1}<span class="svadmin-steps__connector" aria-hidden="true"></span>{/if}
    </li>
  {/each}
</ol>

<style>
  .svadmin-steps { display: flex; gap: var(--svadmin-space-3); margin: 0; padding: 0; list-style: none; }
  .svadmin-steps[data-direction='vertical'] { flex-direction: column; }
  .svadmin-steps__item { position: relative; display: flex; flex: 1; min-width: 0; align-items: flex-start; gap: var(--svadmin-space-2); }
  .svadmin-steps[data-direction='vertical'] .svadmin-steps__item { flex: none; flex-direction: column; gap: var(--svadmin-space-1); }
  .svadmin-steps__action {
    display: flex;
    min-width: 0;
    align-items: flex-start;
    gap: var(--svadmin-space-2);
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: start;
    cursor: default;
  }
  .svadmin-steps__action:not(:disabled) { cursor: pointer; }
  .svadmin-steps__indicator {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--card);
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-caption);
    font-weight: 600;
  }
  .svadmin-steps__item[data-status='finish'] .svadmin-steps__indicator { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); }
  .svadmin-steps__item[data-status='process'] .svadmin-steps__indicator { border-color: var(--primary); color: var(--primary); }
  .svadmin-steps__item[data-status='error'] .svadmin-steps__indicator { border-color: var(--destructive); background: var(--destructive); color: var(--destructive-foreground); }
  .svadmin-steps__text { display: grid; min-width: 0; gap: 0.15rem; }
  .svadmin-steps__title { color: var(--foreground); font-size: var(--svadmin-text-label); font-weight: 600; }
  .svadmin-steps__item[data-status='wait'] .svadmin-steps__title { color: var(--muted-foreground); font-weight: 500; }
  .svadmin-steps__description { color: var(--muted-foreground); font-size: var(--svadmin-text-caption); }
  .svadmin-steps__connector { flex: 1; height: 1px; margin-block-start: 0.875rem; background: var(--border); }
  .svadmin-steps__item[data-status='finish'] .svadmin-steps__connector { background: var(--primary); }
  .svadmin-steps[data-direction='vertical'] .svadmin-steps__connector { width: 1px; height: 1.5rem; margin: 0 0 0 0.875rem; }
  .svadmin-steps[data-label-placement='vertical'] .svadmin-steps__action { flex-direction: column; }
  .svadmin-steps__item[data-disabled='true'] { opacity: 0.5; }
  @media (max-width: 40rem) {
    .svadmin-steps[data-direction='horizontal'] { flex-direction: column; }
    .svadmin-steps[data-direction='horizontal'] .svadmin-steps__connector { width: 1px; height: 1rem; margin-inline-start: 0.875rem; }
  }
</style>
