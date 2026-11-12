<script lang="ts">
  import { Star } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface Props {
    value?: number | undefined;
    count?: number | undefined;
    allowClear?: boolean | undefined;
    name?: string | undefined;
    disabled?: boolean | undefined;
    required?: boolean | undefined;
    invalid?: boolean | undefined;
    describedby?: string | undefined;
    ariaLabel?: string | undefined;
    class?: string | undefined;
    onchange?: ((value: number) => void) | undefined;
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

  let hoverValue = $state<number | null>(null);
  const normalizedCount = $derived(Number.isSafeInteger(count) && count > 0 && count <= 10 ? count : 5);
  const normalizedValue = $derived(Math.min(normalizedCount, Math.max(0, Math.round(value))));
  const displayValue = $derived(hoverValue !== null ? hoverValue : normalizedValue);

  function choose(next: number): void {
    if (disabled) return;
    const selected = allowClear && normalizedValue === next ? 0 : next;
    value = selected;
    hoverValue = null;
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
  onmouseleave={() => { if (!disabled) hoverValue = null; }}
>
  {#if name}<input type="hidden" {name} value={normalizedValue} required={required} {disabled} />{/if}
  {#each Array(normalizedCount) as _, index (index)}
    {@const rating = index + 1}
    {@const isFilled = displayValue >= rating}
    <button
      type="button"
      role="radio"
      aria-label={`${rating} of ${normalizedCount}`}
      aria-checked={normalizedValue >= rating}
      aria-disabled={disabled ? 'true' : undefined}
      tabindex={disabled ? -1 : normalizedValue === rating || (normalizedValue === 0 && index === 0) ? 0 : -1}
      disabled={disabled}
      class:svadmin-rate__button--filled={isFilled}
      onmouseenter={() => { if (!disabled) hoverValue = rating; }}
      onclick={() => choose(rating)}
      onkeydown={(event) => handleKeydown(event, index)}
    >
      <Star fill={isFilled ? 'currentColor' : 'none'} aria-hidden="true" />
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

  .svadmin-rate button {
    transition: transform var(--svadmin-motion-fast) var(--svadmin-motion-easing), color var(--svadmin-motion-fast) var(--svadmin-motion-easing);
  }

  .svadmin-rate button:hover:not(:disabled) {
    transform: scale(1.15);
  }

  .svadmin-rate button[aria-checked='true'],
  .svadmin-rate button.svadmin-rate__button--filled {
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
