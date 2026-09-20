<script lang="ts">
  import { Star } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface Props {
    value?: number;
    count?: number;
    allowClear?: boolean;
    name?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    describedby?: string;
    ariaLabel?: string;
    class?: string;
    onchange?: (value: number) => void;
  }

  let {
    value = $bindable(0),
    count = 5,
    allowClear = true,
    name,
    disabled = false,
    required = false,
    invalid = false,
    describedby,
    ariaLabel = 'Rating',
    class: className = '',
    onchange,
  }: Props = $props();

  const normalizedCount = $derived(Number.isSafeInteger(count) && count > 0 && count <= 10 ? count : 5);
  const normalizedValue = $derived(Math.min(normalizedCount, Math.max(0, Math.round(value))));

  function choose(next: number): void {
    if (disabled) return;
    const selected = allowClear && normalizedValue === next ? 0 : next;
    value = selected;
    onchange?.(selected);
  }

  function handleKeydown(event: KeyboardEvent, index: number): void {
    if (disabled) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      choose(Math.min(normalizedCount, index + 2));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      choose(Math.max(0, index));
    } else if (event.key === 'Home') {
      event.preventDefault();
      choose(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      choose(normalizedCount);
    }
  }
</script>

<div
  class={cn('svadmin-rate', className)}
  role="radiogroup"
  aria-label={ariaLabel}
  aria-invalid={invalid || undefined}
  aria-describedby={describedby}
  data-invalid={invalid ? 'true' : undefined}
>
  {#if name}<input type="hidden" {name} value={normalizedValue} required={required} />{/if}
  {#each Array(normalizedCount) as _, index (index)}
    {@const rating = index + 1}
    <button
      type="button"
      role="radio"
      aria-label={`${rating} of ${normalizedCount}`}
      aria-checked={normalizedValue >= rating}
      aria-disabled={disabled ? 'true' : undefined}
      tabindex={disabled ? -1 : normalizedValue === rating || (normalizedValue === 0 && index === 0) ? 0 : -1}
      disabled={disabled}
      onclick={() => choose(rating)}
      onkeydown={(event) => handleKeydown(event, index)}
    >
      <Star fill={normalizedValue >= rating ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  {/each}
</div>

<style>
  .svadmin-rate {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .svadmin-rate button {
    display: inline-grid;
    place-items: center;
    min-inline-size: 32px;
    min-block-size: 32px;
    padding: 4px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--muted-foreground);
    cursor: pointer;
  }

  .svadmin-rate button[aria-checked='true'] {
    color: var(--warning);
  }

  .svadmin-rate button:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }

  .svadmin-rate button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
