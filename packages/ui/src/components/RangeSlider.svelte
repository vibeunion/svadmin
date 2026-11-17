<script lang="ts">
  import { untrack } from 'svelte';
  import { cn } from '../utils.js';

  export interface RangeSliderValue {
    min: number;
    max: number;
  }

  interface Props {
    value?: RangeSliderValue;
    defaultValue?: RangeSliderValue;
    min?: number;
    max?: number;
    step?: number;
    minName?: string;
    maxName?: string;
    disabled?: boolean;
    invalid?: boolean;
    describedby?: string;
    ariaLabel?: string;
    showValue?: boolean;
    tooltipVisible?: boolean;
    reverse?: boolean;
    marks?: Record<number, string>;
    class?: string;
    onchange?: (value: RangeSliderValue) => void;
  }

  let {
    value = $bindable(),
    defaultValue = { min: 0, max: 100 },
    min = 0,
    max = 100,
    step = 1,
    minName,
    maxName,
    disabled = false,
    invalid = false,
    describedby,
    ariaLabel,
    showValue = false,
    tooltipVisible = false,
    reverse = false,
    marks,
    class: className = '',
    onchange,
  }: Props = $props();

  let internalValue = $state(untrack(() => defaultValue));
  const effectiveValue = $derived(value !== undefined ? value : internalValue);

  const boundsValid = $derived(
    Number.isFinite(min) && Number.isFinite(max) && min < max
      && Number.isFinite(step) && step > 0,
  );
  const lower = $derived(boundsValid ? Math.min(max, Math.max(min, effectiveValue.min)) : min);
  const upper = $derived(boundsValid ? Math.min(max, Math.max(lower, effectiveValue.max)) : max);
  const isValueVisible = $derived(showValue || tooltipVisible);

  function update(part: 'min' | 'max', raw: string): void {
    if (disabled || !boundsValid) return;
    const next = Number(raw);
    if (!Number.isFinite(next)) return;
    const result = part === 'min'
      ? { min: Math.min(next, upper), max: upper }
      : { min: lower, max: Math.max(next, lower) };
    if (value !== undefined) {
      value = result;
    } else {
      internalValue = result;
    }
    onchange?.(result);
  }
</script>

<div
  class={cn('svadmin-range-slider', className)}
  data-invalid={invalid ? 'true' : undefined}
  data-reverse={reverse ? 'true' : undefined}
  style={reverse ? 'direction: rtl;' : undefined}
>
  <div class="svadmin-range-slider__control">
    {#if minName}<input type="hidden" name={minName} value={lower} />{/if}
    {#if maxName}<input type="hidden" name={maxName} value={upper} />{/if}
    <div class="svadmin-range-slider__tracks">
      <input
        type="range"
        value={lower}
        {min}
        max={upper}
        {step}
        disabled={disabled}
        aria-label={ariaLabel ? `${ariaLabel} minimum` : 'Minimum'}
        aria-invalid={invalid || undefined}
        aria-describedby={describedby}
        oninput={(event) => update('min', (event.currentTarget as HTMLInputElement).value)}
      />
      <input
        type="range"
        value={upper}
        min={lower}
        {max}
        {step}
        disabled={disabled}
        aria-label={ariaLabel ? `${ariaLabel} maximum` : 'Maximum'}
        aria-invalid={invalid || undefined}
        aria-describedby={describedby}
        oninput={(event) => update('max', (event.currentTarget as HTMLInputElement).value)}
      />
    </div>
    {#if isValueVisible}<output>{lower} - {upper}</output>{/if}
  </div>
  {#if marks && Object.keys(marks).length > 0}
    <div data-slot="slider-marks">
      {#each Object.entries(marks) as [markVal, label] (markVal)}
        {@const valNum = Number(markVal)}
        {@const pct = boundsValid ? Math.min(100, Math.max(0, ((valNum - min) / (max - min)) * 100)) : 0}
        <span class="svadmin-slider__mark" style={`left: ${pct}%;`}>
          {label}
        </span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .svadmin-range-slider {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    inline-size: 100%;
  }

  .svadmin-range-slider__control {
    display: flex;
    align-items: center;
    gap: 8px;
    inline-size: 100%;
  }

  .svadmin-range-slider__tracks {
    display: grid;
    flex: 1 1 auto;
    min-inline-size: 0;
  }

  .svadmin-range-slider__tracks input {
    grid-area: 1 / 1;
    inline-size: 100%;
    margin: 0;
    accent-color: var(--primary);
  }

  .svadmin-range-slider__tracks input:last-child {
    pointer-events: none;
  }

  .svadmin-range-slider__tracks input:last-child:focus-visible {
    pointer-events: auto;
  }

  .svadmin-range-slider output {
    min-inline-size: 7ch;
    color: var(--muted-foreground);
    text-align: end;
    font-variant-numeric: tabular-nums;
  }
</style>
