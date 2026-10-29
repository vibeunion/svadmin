<script lang="ts">
  import { Grid2X2, List } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface Props {
    value?: 'table' | 'cards';
    tableLabel?: string;
    cardsLabel?: string;
    disabled?: boolean;
    class?: string;
    onchange?: (value: 'table' | 'cards') => void;
  }

  let {
    value = $bindable('table'),
    tableLabel = 'Table view',
    cardsLabel = 'Card view',
    disabled = false,
    class: className = '',
    onchange,
  }: Props = $props();

  function select(next: 'table' | 'cards'): void {
    if (disabled || next === value) return;
    value = next;
    onchange?.(next);
  }
</script>

<div class={cn('svadmin-view-mode-toggle', className)} role="group" aria-label="View mode">
  <button type="button" aria-pressed={value === 'table'} aria-label={tableLabel} {disabled} onclick={() => select('table')}>
    <List size={15} aria-hidden="true" />
    <span>{tableLabel}</span>
  </button>
  <button type="button" aria-pressed={value === 'cards'} aria-label={cardsLabel} {disabled} onclick={() => select('cards')}>
    <Grid2X2 size={15} aria-hidden="true" />
    <span>{cardsLabel}</span>
  </button>
</div>

<style>
  .svadmin-view-mode-toggle { display: inline-flex; padding: 2px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--muted); }
  .svadmin-view-mode-toggle button { display: inline-flex; align-items: center; gap: var(--svadmin-space-1); min-height: 1.75rem; padding-inline: var(--svadmin-space-2); border: 0; border-radius: calc(var(--radius-sm) - 1px); background: transparent; color: var(--muted-foreground); font-size: var(--svadmin-text-caption); cursor: pointer; }
  .svadmin-view-mode-toggle button[aria-pressed='true'] { background: var(--card); color: var(--foreground); box-shadow: var(--svadmin-shadow-control); font-weight: 600; }
  .svadmin-view-mode-toggle button:focus-visible { outline: 2px solid var(--ring); outline-offset: 1px; }
  .svadmin-view-mode-toggle button:disabled { cursor: not-allowed; opacity: 0.5; }
</style>
