<script lang="ts">
  import { untrack } from 'svelte';
  import { cn } from '../utils.js';

  interface Props {
    value?: number;
    defaultValue?: number;
    min?: number;
    max?: number;
    step?: number;
    id?: string;
    name?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    describedby?: string;
    ariaLabel?: string;
    showValue?: boolean;
    tooltipVisible?: boolean;
    reverse?: boolean;
    marks?: Record<number, string>;
    class?: string;
    onChange?: (value: number) => void;
    onchange?: (value: number) => void;
  }

  let {
    value = $bindable(),
    defaultValue = 0,
    min = 0,
    max = 100,
    step = 1,
    id,
    name,
    disabled = false,
    required = false,
    invalid = false,
    describedby,
    ariaLabel,
    showValue = false,
    tooltipVisible = false,
    reverse = false,
    marks,
    class: className = '',
    onChange,
    onchange,
  }: Props = $props();

  const emitChange = (next: number): void => {
    onchange?.(next);
    onChange?.(next);
  };

  let internalValue = $state(untrack(() => defaultValue));
  const effectiveValue = $derived(value !== undefined ? value : internalValue);

  const boundsValid = $derived(
    Number.isFinite(min) && Number.isFinite(max) && min < max
      && Number.isFinite(step) && step > 0,
  );
  const normalizedValue = $derived(
    boundsValid ? Math.min(max, Math.max(min, Number.isFinite(effectiveValue) ? effectiveValue : min)) : min,
  );
  const isValueVisible = $derived(showValue || tooltipVisible);

  function handleInput(event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement) || disabled || !boundsValid) return;
    const next = Number(input.value);
    if (!Number.isFinite(next)) return;
    if (value !== undefined) {
      value = next;
    } else {
      internalValue = next;
    }
    emitChange(next);
  }
</script>

<div
  class={cn('svadmin-slider', className)}
  data-invalid={invalid ? 'true' : undefined}
  data-reverse={reverse ? 'true' : undefined}
  style={reverse ? 'direction: rtl;' : undefined}
>
  <div class="svadmin-slider__control">
    <input
      {id}
      {name}
      type="range"
      value={normalizedValue}
      {min}
      {max}
      {step}
      {disabled}
      {required}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      aria-describedby={describedby}
      aria-valuetext={isValueVisible ? String(normalizedValue) : undefined}
      oninput={handleInput}
    />
    {#if isValueVisible}<output for={id}>{normalizedValue}</output>{/if}
  </div>
  {#if marks && Object.keys(marks).length > 0}
    <div data-slot="slider-marks">
      {#each Object.entries(marks) as [markVal, label] (markVal)}
        {@const valNum = Number(markVal)}
        {@const pct = boundsValid ? Math.min(100, Math.max(0, ((valNum - min) / (max - min)) * 100)) : 0}
        <button
          type="button"
          class="svadmin-slider__mark"
          style={`left: ${pct}%;`}
          disabled={disabled}
          onclick={() => { if (!disabled) { value = valNum; emitChange(valNum); } }}
        >
          {label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .svadmin-slider {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    inline-size: 100%;
  }

  .svadmin-slider__control {
    display: flex;
    align-items: center;
    gap: 8px;
    inline-size: 100%;
  }

  .svadmin-slider input {
    min-inline-size: 0;
    flex: 1 1 auto;
    accent-color: var(--primary);
  }

  .svadmin-slider output {
    min-inline-size: 3ch;
    color: var(--muted-foreground);
    text-align: end;
    font-variant-numeric: tabular-nums;
  }

  .svadmin-slider[data-invalid='true'] input {
    accent-color: var(--destructive);
  }
</style>
