<script lang="ts">
  import { Star } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface Props {
    value?: number | undefined;
    count?: number | undefined;
    allowClear?: boolean | undefined;
    allowHalf?: boolean | undefined;
    readonly?: boolean | undefined;
    size?: 'mini' | 'small' | 'default' | 'large' | number | undefined;
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
    allowHalf = false,
    readonly = false,
    size = 'default',
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
  const normalizedValue = $derived(Math.min(normalizedCount, Math.max(0, allowHalf ? Math.round(value * 2) / 2 : Math.round(value))));
  const displayValue = $derived(hoverValue !== null ? hoverValue : normalizedValue);

  const starIconSize = $derived.by(() => {
    if (typeof size === 'number') return size;
    if (size === 'mini') return 14;
    if (size === 'small') return 18;
    if (size === 'large') return 30;
    return 24;
  });

  function choose(next: number): void {
    if (disabled || readonly) return;
    const selected = allowClear && normalizedValue === next ? 0 : next;
    value = selected;
    hoverValue = null;
    onchange?.(selected);
  }

  function handlePointerMove(event: MouseEvent, rating: number): void {
    if (disabled || readonly) return;
    if (!allowHalf) {
      hoverValue = rating;
      return;
    }
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const isLeftHalf = (event.clientX - rect.left) < rect.width / 2;
    hoverValue = isLeftHalf ? rating - 0.5 : rating;
  }

  function handleClick(event: MouseEvent, rating: number): void {
    if (disabled || readonly) return;
    let next = rating;
    if (allowHalf) {
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const isLeftHalf = (event.clientX - rect.left) < rect.width / 2;
      next = isLeftHalf ? rating - 0.5 : rating;
    }
    choose(next);
  }

  function handleKeydown(event: KeyboardEvent, _index: number): void {
    if (disabled || readonly) return;
    const delta = allowHalf ? 0.5 : 1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      choose(Math.min(normalizedCount, normalizedValue + delta));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      choose(Math.max(0, normalizedValue - delta));
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
  tabindex={-1}
  aria-label={ariaLabel}
  aria-invalid={invalid || undefined}
  aria-describedby={describedby}
  data-invalid={invalid ? 'true' : undefined}
  data-readonly={readonly ? 'true' : undefined}
  data-size={typeof size === 'number' ? undefined : size}
  onmouseleave={() => { if (!disabled && !readonly) hoverValue = null; }}
>
  {#if name}<input type="hidden" {name} value={normalizedValue} required={required} {disabled} />{/if}
  {#each Array(normalizedCount) as _, index (index)}
    {@const rating = index + 1}
    {@const isFilled = displayValue >= rating}
    {@const isHalf = allowHalf && displayValue === rating - 0.5}
    <button
      type="button"
      role="radio"
      aria-label={`${rating} of ${normalizedCount}`}
      aria-checked={normalizedValue >= rating}
      aria-disabled={disabled || readonly ? 'true' : undefined}
      tabindex={disabled || readonly ? -1 : normalizedValue === rating || (normalizedValue === 0 && index === 0) ? 0 : -1}
      disabled={disabled}
      class:svadmin-rate__button--filled={isFilled || isHalf}
      class:svadmin-rate__button--half={isHalf}
      class:svadmin-rate__button--readonly={readonly}
      onmouseenter={(event) => handlePointerMove(event, rating)}
      onmousemove={(event) => handlePointerMove(event, rating)}
      onclick={(event) => handleClick(event, rating)}
      onkeydown={(event) => handleKeydown(event, index)}
    >
      <span class="svadmin-rate__star-wrapper">
        {#if isHalf}
          <span class="svadmin-rate__half" aria-hidden="true">
            <Star fill="currentColor" size={starIconSize} />
          </span>
          <Star fill="none" size={starIconSize} aria-hidden="true" />
        {:else}
          <Star fill={isFilled ? 'currentColor' : 'none'} size={starIconSize} aria-hidden="true" />
        {/if}
      </span>
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
    position: relative;
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

  .svadmin-rate[data-size='mini'] button {
    min-inline-size: 20px;
    min-block-size: 20px;
    padding: 2px;
  }

  .svadmin-rate[data-size='small'] button {
    min-inline-size: 26px;
    min-block-size: 26px;
    padding: 3px;
  }

  .svadmin-rate[data-size='large'] button {
    min-inline-size: 40px;
    min-block-size: 40px;
    padding: 5px;
  }

  .svadmin-rate button {
    transition: transform var(--svadmin-motion-fast) var(--svadmin-motion-easing), color var(--svadmin-motion-fast) var(--svadmin-motion-easing);
  }

  .svadmin-rate button:hover:not(:disabled):not(.svadmin-rate__button--readonly) {
    transform: scale(1.15);
  }

  .svadmin-rate button[aria-checked='true'],
  .svadmin-rate button.svadmin-rate__button--filled {
    color: var(--warning);
  }

  .svadmin-rate__star-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .svadmin-rate__half {
    position: absolute;
    inset-inline-start: 0;
    inset-block-start: 0;
    width: 50%;
    height: 100%;
    overflow: hidden;
    color: var(--warning);
    pointer-events: none;
  }

  .svadmin-rate__button--readonly {
    cursor: default;
  }

  .svadmin-rate__button--half {
    position: relative;
  }

  .svadmin-rate button:focus-visible {
    outline: var(--svadmin-focus-width) solid var(--ring);
    outline-offset: var(--svadmin-focus-offset);
  }

  .svadmin-rate button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
